// WS Tutorial
// https://www.mischianti.org/2020/12/07/websocket-on-arduino-esp8266-and-esp32-client-1/
#include <AnimatedGIF.h>
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <LittleFS.h>
#include <WebSocketsClient.h>  //Requires WebSockets library by Markus Sattler
#include <WiFiManager.h>       // https://github.com/tzapu/WiFiManager
#include <qrcode.h>            // https://github.com/ricmoo/QRCode
#include <LovyanGFX.hpp>

enum Screen {
  SETUP_STEP_1 = 0,
  SETUP_STEP_2 = 1,
  WELCOME = 2,
  IMAGE = 3,
  ERROR = 4,
  NONE = 5
};

class LGFX_ST7735 : public lgfx::LGFX_Device {
  lgfx::Panel_ST7735S _panel_instance;
  lgfx::Bus_SPI _bus_instance;

public:
  LGFX_ST7735() {
    {
      auto cfg = _bus_instance.config();

      // SPI settings (DO NOT include spi_host on ESP8266)
      cfg.spi_mode = 0;
      cfg.freq_write = 27000000;
      cfg.freq_read = 16000000;
      cfg.pin_sclk = 14;  // D5
      cfg.pin_mosi = 13;  // D7
      cfg.pin_miso = -1;  // Not used
      cfg.pin_dc = 0;     // D3

      _bus_instance.config(cfg);
      _panel_instance.setBus(&_bus_instance);
    }

    {
      auto cfg = _panel_instance.config();

      cfg.pin_cs = 15;  // D8
      cfg.pin_rst = 2;  // D4
      cfg.pin_busy = -1;
      cfg.panel_width = 128;
      cfg.panel_height = 160;
      cfg.memory_width = 128;
      cfg.memory_height = 160;
      cfg.offset_x = 0;
      cfg.offset_y = 0;
      cfg.offset_rotation = 0;
      cfg.dummy_read_pixel = 8;
      cfg.dummy_read_bits = 1;
      cfg.readable = false;
      cfg.invert = false;  // Change to false if colors look inverted
      cfg.rgb_order = 1;
      cfg.bus_shared = false;

      _panel_instance.config(cfg);
    }

    setPanel(&_panel_instance);
  }
};

LGFX_ST7735 tft;
AnimatedGIF gif;

// Incoming message types
#define NEW_MSG 1
#define GIF_MSG 2
#define EOF_MSG 3
#define IMG_MSG 4

// Pins
#define BUTTON_PIN 5
#define BACKLIGHT_PIN 16
#define ONBOARD_LED 2

// Constants
#define WIDTH 128
#define HEIGHT 160
#define BUFFER_SIZE 10000
#define MAX_FILE_SIZE 2000000
#define ID_LENGTH 6
#define UNIQUE_ID_SUFFIX 'A'
char deviceID[ID_LENGTH] = { 0 };
char WS_PATH[128];

// WiFi/WS connection vars
WebSocketsClient webSocket;
const char *UI_URL = "http://example.com";  // REPLACE WITH ADDRESS OF UI SERVER
const char *WS_HOST = "0.0.0.0";       // REPLACE WITH YOUR WS HOST
const int WS_PORT = 8080;                   // REPLACE WITH YOUR WS PORT
bool wifiConnected = false;
bool wsConnected = false;
uint16_t seqnum = 0;
WiFiManager wifiManager;
const char *AP_SSID = "StatusTagSetup";  // SSID of setup AP network
const char *AP_PASS = "GettingStarted";  // Password of setup AP network

// Display vars
uint16_t *latestImageData;
File gifFile;
const char *GIF_FILE_NAME = "/gif.gif";
bool isGifFileOpen = false;
bool isGifActive = false;
bool loadingData = false;
bool readyForNextPacket = false;

// Operation variables
Screen screenShown = NONE;
Screen prevScreen = NONE;
const char *SERVER_UNREACHABLE = "Unable to reach server";
const int resetPressTime = 10000; // Long-press duration for factory reset
bool isSleeping = false;
unsigned long buttonPressStart = 0;
bool buttonWasPressed = false;
void enterSleep();
void wakeUp();

void setup() {
  pinMode(BUTTON_PIN, INPUT);
  pinMode(ONBOARD_LED, OUTPUT);
  pinMode(BACKLIGHT_PIN, OUTPUT);

  tft.init();
  digitalWrite(BACKLIGHT_PIN, HIGH);
  Serial.begin(115200);
  Serial.println(WS_PATH);
  if (!LittleFS.begin()) {
    Serial.println("Failed to mount LittleFS");
    return;
  }

  for (uint8_t t = 3; t > 0; t--) {
    Serial.printf("[SETUP] BOOT WAIT %d...\n", t);
    Serial.flush();
    delay(1000);
  }
  Serial.println(WiFi.macAddress());

  // Device ID setup
  if (LittleFS.exists("/ID.txt")) {
    File idFile = LittleFS.open("/ID.txt", "r");
    idFile.readBytes(deviceID, ID_LENGTH);
    deviceID[ID_LENGTH] = '\0';
    idFile.close();
  } else {
    const char charset[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (int i = 0; i < ID_LENGTH - 1; ++i) {
      deviceID[i] = charset[random(0, sizeof(charset) - 1)];
    }
    deviceID[ID_LENGTH - 1] = UNIQUE_ID_SUFFIX;
    deviceID[ID_LENGTH] = '\0';
    File idFile = LittleFS.open("/ID.txt", "w");
    idFile.write((uint8_t *)deviceID, ID_LENGTH);
    idFile.close();
  }
  snprintf(WS_PATH, sizeof(WS_PATH), "/ws?id=%s&width=%d&height=%d&bufferSize=%d&maxFileSize=%d", deviceID, WIDTH, HEIGHT, BUFFER_SIZE, MAX_FILE_SIZE);

  // WiFiManager: Automatically connect or start config portal if needed
  wifiManager.setConfigPortalBlocking(false);
  wifiManager.setAPCallback([](WiFiManager *wmm) {
    showSetupStep1();
  });
  wifiConnected = wifiManager.autoConnect(AP_SSID, AP_PASS);
  if (wifiConnected) {
    tft.fillScreen(TFT_BLACK);
    Serial.println("WiFi connected!");
    Serial.print("Local IP: ");
    Serial.println(WiFi.localIP());
    delay(50);

    // Set up web socket connection
    webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
    webSocket.onEvent(webSocketEvent);

    gif.begin(BIG_ENDIAN_PIXELS);
  }
}

void loop() {
  handleButton();
  if (isSleeping) {
    // While sleeping, do nothing but wait for wakeup
    gpio_pin_wakeup_enable(GPIO_ID_PIN(BUTTON_PIN), GPIO_PIN_INTR_LOLEVEL);
    delay(50);
    return;
  }

  if (wifiConnected) {
    webSocket.loop();
    if (isGifActive && !isGifFileOpen && !loadingData) {
      if (gif.open(GIF_FILE_NAME, GIFOpenFile, GIFCloseFile, GIFReadFile,
                   GIFSeekFile, GIFDraw)) {
        changeScreen(IMAGE);
        while (gif.playFrame(true, NULL)) {
          yield();
        }
        gif.close();
      } else {
        Serial.println("ERROR: Failed to load GIF file");
      }
    }

    if (wsConnected && loadingData && readyForNextPacket) {
      readyForNextPacket = false;
      webSocket.sendBIN((uint8_t *)&seqnum, sizeof(seqnum));
    }
  } else {
    //WifiManager config portal processing
    if (wifiManager.process()) {
      ESP.restart();
    }

    // Show setup page - Step 2 if a device has already connected to the AP, Step 1 otherwise
    if (WiFi.softAPgetStationNum() > 0) {
      if(screenShown != ERROR){
        changeScreen(SETUP_STEP_2);
      }
    } else {
      if(screenShown != ERROR){
        changeScreen(SETUP_STEP_1);
      }
    }
  }
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      showError(SERVER_UNREACHABLE, false);
      Serial.printf("[WS] Disconnected!\n");
      wsConnected = false;
      loadingData = false;
      break;
    case WStype_CONNECTED:
      Serial.printf("[WS] Connected to url: %s\n", payload);
      changeScreen(WELCOME);
      wsConnected = true;
      seqnum = 0;
      break;

    case WStype_TEXT:
      Serial.printf("[WS] Received text: %s\n", payload);
      break;

    case WStype_BIN:
      uint16_t *msgData = (uint16_t *)payload;
      seqnum++;

      // First 2 bytes are msg type
      uint16_t msgType = msgData[0];

      // Handle message
      switch (msgType) {
        case NEW_MSG:
          Serial.println("New image/gif data is available!");
          seqnum = 0;
          loadingData = true;
          break;
        case GIF_MSG:
          openGifFile();
          Serial.printf("> Writing %d bytes to GIF file\n", length - 2);
          gifFile.write(payload + 2, length - 2);
          isGifActive = true;
          break;
        case IMG_MSG:
          Serial.println("> Processing image data");
          latestImageData = msgData;
          isGifActive = false;
          changeScreen(IMAGE);
          break;
        case EOF_MSG:
          Serial.println("Finished processing new data");
          loadingData = false;
          closeGifFile();
          break;
        default:
          Serial.printf("Unrecognized message type %d\n", msgType);
      }
      readyForNextPacket = true;
      break;
  }
}

void handleButton() {
  bool buttonPressed = digitalRead(BUTTON_PIN) == LOW;
  if (buttonPressed && !buttonWasPressed) {
    buttonPressStart = millis();
    buttonWasPressed = true;
  } else if (!buttonPressed && buttonWasPressed) {
    unsigned long pressDuration = millis() - buttonPressStart;
    buttonWasPressed = false;
    if (pressDuration >= resetPressTime) {
      // Long press: reset device
      Serial.println("Long press detected: resetting device");
      wifiManager.resetSettings();
      LittleFS.format();
      ESP.restart();
    } else if(pressDuration > (resetPressTime / 2)){
      restoreScreen();
    } else if (pressDuration > 20) {
      // Short press: toggle sleep/awake
      Serial.print("Short press detected: toggling sleep mode: ");
      Serial.println(isSleeping ? "Waking up" : "Entering sleep");
      if (!isSleeping) {
        enterSleep();
      } else {
        isSleeping = false;
      }
    }
  } else if (buttonPressed && buttonWasPressed) {
    unsigned long pressDuration = millis() - buttonPressStart;
    if (pressDuration > resetPressTime && pressDuration % 1000 < 20) {
      showError("Release button to FACTORY RESET", true);
    } else if (pressDuration >= (resetPressTime / 2) && pressDuration % 1000 < 20) {
      char errorText[128];
      snprintf(errorText, sizeof(errorText), "Hold button for another %d seconds to FACTORY RESET", ((resetPressTime - pressDuration) / 1000));
      showError(errorText, true);
    }
  }
}

void openGifFile() {
  if (!isGifFileOpen) {
    clearGifFile();
    Serial.println("Opening GIF file for writing");
    gifFile = LittleFS.open(GIF_FILE_NAME, "a");
    isGifFileOpen = true;
  }
}

void closeGifFile() {
  if (isGifFileOpen) {
    Serial.println("Closing GIF file");
    gifFile.close();
    isGifFileOpen = false;
  }
}

void clearGifFile() {
  Serial.println("Clearing GIF file");
  closeGifFile();
  LittleFS.remove(GIF_FILE_NAME);
}


void enterSleep() {
  Serial.println("Entering light sleep mode");
  tft.sleep();
  digitalWrite(BACKLIGHT_PIN, LOW);
  delay(100);
  isSleeping = true;
  // Enter light sleep (will wake on button press)
  // Disable timer wake, enable GPIO wake
  wifi_set_opmode(NULL_MODE);
  wifi_fpm_set_sleep_type(LIGHT_SLEEP_T);
  wifi_fpm_open();
  wifi_fpm_set_wakeup_cb(wakeUp);
  wifi_fpm_do_sleep(0xFFFFFFF);  // sleep indefinitely until GPIO wake
}


void wakeUp() {
  Serial.println("Waking up from light sleep");
  tft.wakeup();
  digitalWrite(BACKLIGHT_PIN, HIGH);
}

void showSetupStep1() {
  Serial.println("Showing Step 1");
  char qrText[128];
  char ssidText[128];
  char passText[128];
  char label[128 * 2];
  snprintf(qrText, sizeof(qrText), "WIFI:T:WPA;S:%s;P:%s;;", AP_SSID, AP_PASS);
  snprintf(ssidText, sizeof(ssidText), "SSID: %s", AP_SSID);
  snprintf(passText, sizeof(passText), "Pass: %s", AP_PASS);
  snprintf(label, sizeof(label), "%s \n %s", ssidText, passText);
  showQRCode(qrText, 2, 5, "STEP 1", label, true);
}

void showSetupStep2() {
  Serial.println("Showing Step 2");
  showQRCode("http://192.168.4.1/wifi?", 3, 3, "STEP 2", "Open Setup Page \n http://192.168.4.1", true);
}

void showWelcome() {
  Serial.println("Showing welcome");
  char idText[128];
  snprintf(idText, sizeof(idText), "ID: %s", deviceID);
  showQRCode(UI_URL, 3, 3, idText, "Log in here to get started!", false);
}

void showQRCode(const char *text, int scale, int qrVersion, const char *title, const char *label, bool titleOnTop) {
  // Draw QR code
  QRCode qrcode;
  uint8_t qrcodeData[qrcode_getBufferSize(qrVersion)];
  qrcode_initText(&qrcode, qrcodeData, qrVersion, ECC_MEDIUM, text);
  tft.fillScreen(TFT_WHITE);
  int offsetX = (WIDTH - qrcode.size * scale) / 2;
  int offsetY = (HEIGHT - qrcode.size * scale) / 2;
  for (uint8_t y = 0; y < qrcode.size; y++) {
    for (uint8_t x = 0; x < qrcode.size; x++) {
      uint16_t color = qrcode_getModule(&qrcode, x, y) ? TFT_BLACK : TFT_WHITE;
      tft.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale, color);
    }
  }

  // Determine text locations
  int topTextY = 8;
  int bottomTextY = offsetY + qrcode.size * scale + 4;  // 4px gap below QR

  // Draw title
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_BLACK, TFT_WHITE);
  tft.setTextSize(1.5);
  printWrapped(title, titleOnTop ? topTextY : bottomTextY, true);

  // Draw each label centered on its own line
  tft.setTextSize(0.85);
  printWrapped(label, titleOnTop ? bottomTextY : topTextY, true);
}

void showError(const char *errorText, bool force) {
  if (!changeScreen(ERROR) && !force) { return; }

  // Clear screen
  tft.fillScreen(TFT_WHITE);

  // Dimensions for "error" triangle
  int triHeight = HEIGHT / 4;
  int triBase = triHeight;
  int triCenterX = WIDTH / 2;
  int triTopY = triHeight / 4;  //Padding from top
  int triLeftX = triCenterX - triBase / 2;
  int triRightX = triCenterX + triBase / 2;
  int triBottomY = triTopY + triHeight;

  // Draw filled red triangle
  tft.fillTriangle(triCenterX, triTopY, triLeftX, triBottomY, triRightX, triBottomY, TFT_RED);

  // Draw exclamation mark in triangle
  tft.setTextColor(TFT_WHITE, TFT_RED);
  tft.setFont(&fonts::FreeMonoBold24pt7b);
  tft.setTextSize(0.5);
  const char *exMark = "!";
  int exWidth = tft.textWidth(exMark);
  int exHeight = tft.fontHeight();
  tft.setCursor(triCenterX - exWidth / 2, triTopY + triBottomY / 2 - exHeight / 2);
  tft.print(exMark);

  // Show error text below triangle with word wrapping
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_BLACK, TFT_WHITE);
  tft.setTextSize(1);
  printWrapped(errorText, triBottomY + 8, true);
}


void printWrapped(const char *text, int startY, bool centered) {
  int fontHeight = tft.fontHeight();
  int labelY = startY;       // 8px gap below triangle
  int maxWidth = WIDTH - 8;  // 4px margin each side
  char line[64];
  int lineLen = 0;
  int y = labelY;
  const char *p = text;
  while (*p) {
    // Start a new line
    lineLen = 0;
    int lastSpace = -1;
    int i = 0;
    while (p[i] && lineLen < (int)sizeof(line) - 1) {
      line[lineLen] = p[i];
      if (p[i] == ' ') lastSpace = lineLen;
      line[lineLen + 1] = '\0';
      if (tft.textWidth(line) > maxWidth) break;
      lineLen++;
      i++;
    }
    if (lineLen == 0) break;
    // If we broke at a word, back up to last space
    if (p[i] && lastSpace != -1) {
      line[lastSpace] = '\0';
      i = lastSpace + 1;
    }
    int textWidth = tft.textWidth(line);
    int x = centered ? ((WIDTH - textWidth) / 2) : 4;
    tft.setCursor(x, y);
    tft.print(line);
    y += fontHeight;
    p += i;
    while (*p == ' ') ++p;  // skip spaces at start of next line
  }
}

bool changeScreen(Screen newScreen) {
  if (newScreen == IMAGE && !isGifActive) {
    // Display newest static image
    tft.pushImage(latestImageData[1], latestImageData[2], latestImageData[3], latestImageData[4], latestImageData + 5);
  }

  // Do not make any changes if the new screen is the same as the old one
  if (screenShown == newScreen) {
    return false;
  }

  // Show setup screens
  if(newScreen == SETUP_STEP_2){
    showSetupStep2();
  }
  if(newScreen == SETUP_STEP_1){
    showSetupStep1();
  }

  // Show welcome screen
  if(newScreen == WELCOME) {
    showWelcome();
  }

  // Store previous screen state and set new one
  prevScreen = screenShown;
  screenShown = newScreen;
  return true;
}

// Restore previous screen state
void restoreScreen() {
  if(changeScreen(prevScreen)){
    prevScreen = NONE;
  }
}

///////////////////////////
// AnimatedGIF Callbacks //
///////////////////////////
void *GIFOpenFile(const char *filename, int32_t *pSize) {
  gifFile = LittleFS.open(filename, "r");
  *pSize = gifFile.size();
  return (void *)&gifFile;
}

void GIFCloseFile(void *pHandle) {
  File *f = static_cast<File *>(pHandle);
  if (f != NULL) f->close();
}

int32_t GIFReadFile(GIFFILE *pFile, uint8_t *pBuf, int32_t iLen) {
  int32_t iBytesRead;
  iBytesRead = iLen;
  File *f = static_cast<File *>(pFile->fHandle);
  // Note: If you read a file all the way to the last byte, seek() stops working
  if ((pFile->iSize - pFile->iPos) < iLen)
    iBytesRead = pFile->iSize - pFile->iPos - 1;  // <-- ugly work-around
  if (iBytesRead <= 0) return 0;
  iBytesRead = (int32_t)f->read(pBuf, iBytesRead);
  pFile->iPos = f->position();
  return iBytesRead;
}

int32_t GIFSeekFile(GIFFILE *pFile, int32_t iPosition) {
  File *f = static_cast<File *>(pFile->fHandle);
  f->seek(iPosition);
  pFile->iPos = (int32_t)f->position();
  return pFile->iPos;
}

void GIFDraw(GIFDRAW *pDraw) {
  uint8_t *s;
  uint16_t *d, *usPalette, usTemp[320];
  int x, y, iWidth;

  iWidth = pDraw->iWidth;
  if (iWidth > 128) iWidth = 128;
  usPalette = pDraw->pPalette;
  y = pDraw->iY + pDraw->y;  // current line

  s = pDraw->pPixels;
  if (pDraw->ucDisposalMethod == 2) {  // restore to background color
    for (x = 0; x < iWidth; x++) {
      if (s[x] == pDraw->ucTransparent) s[x] = pDraw->ucBackground;
    }
    pDraw->ucHasTransparency = 0;
  }
  // Apply the new pixels to the main image
  if (pDraw->ucHasTransparency) {  // if transparency used
    uint8_t *pEnd, c, ucTransparent = pDraw->ucTransparent;
    int x, iCount;
    pEnd = s + iWidth;
    x = 0;
    iCount = 0;  // count non-transparent pixels
    while (x < iWidth) {
      c = ucTransparent - 1;
      d = usTemp;
      while (c != ucTransparent && s < pEnd) {
        c = *s++;
        if (c == ucTransparent) {  // done, stop
          s--;                     // back up to treat it like transparent
        } else {                   // opaque
          *d++ = usPalette[c];
          iCount++;
        }
      }              // while looking for opaque pixels
      if (iCount) {  // any opaque pixels?
        tft.pushRect(pDraw->iX + x, y, iCount, 1, (uint16_t *)usTemp);
        x += iCount;
        iCount = 0;
      }
      // no, look for a run of transparent pixels
      c = ucTransparent;
      while (c == ucTransparent && s < pEnd) {
        c = *s++;
        if (c == ucTransparent)
          iCount++;
        else
          s--;
      }
      if (iCount) {
        x += iCount;  // skip these
        iCount = 0;
      }
    }
  } else {
    s = pDraw->pPixels;
    // Translate the 8-bit pixels through the RGB565 palette (already byte
    // reversed)
    for (x = 0; x < iWidth; x++) usTemp[x] = usPalette[*s++];
    tft.pushRect(pDraw->iX, y, iWidth, 1, (uint16_t *)usTemp);
  }
}