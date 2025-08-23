//WS Tutorial https://www.mischianti.org/2020/12/07/websocket-on-arduino-esp8266-and-esp32-client-1/ 
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>   //Requires WebSockets library by Markus Sattler
#include <LovyanGFX.hpp>
#include <AnimatedGIF.h>
#include <LittleFS.h>

class LGFX_ST7735 : public lgfx::LGFX_Device {
  lgfx::Panel_ST7735S _panel_instance;
  lgfx::Bus_SPI _bus_instance;

public:
  LGFX_ST7735() {
    {
      auto cfg = _bus_instance.config();

      // SPI settings (DO NOT include spi_host on ESP8266)
      cfg.spi_mode   = 0;
      cfg.freq_write = 27000000;
      cfg.freq_read  = 16000000;
      cfg.pin_sclk   = 14;  // D5
      cfg.pin_mosi   = 13;  // D7
      cfg.pin_miso   = -1;  // Not used
      cfg.pin_dc     = 0;   // D3

      _bus_instance.config(cfg);
      _panel_instance.setBus(&_bus_instance);
    }

    {
      auto cfg = _panel_instance.config();

      cfg.pin_cs           = 15;  // D8
      cfg.pin_rst          = 2;   // D4
      cfg.pin_busy         = -1;
      cfg.panel_width      = 128;
      cfg.panel_height     = 160;
      cfg.memory_width     = 128;
      cfg.memory_height    = 160;
      cfg.offset_x         = 0;
      cfg.offset_y         = 0;
      cfg.offset_rotation  = 0;
      cfg.dummy_read_pixel = 8;
      cfg.dummy_read_bits  = 1;
      cfg.readable         = false;
      cfg.invert           = false;   // Change to false if colors look inverted
      cfg.rgb_order        = 1;
      cfg.bus_shared       = false;

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
#define ONBOARD_LED 2

// Macros
#define STR_HELPER(x) #x
#define STR(x) STR_HELPER(x)

// Constants
#define ID "finally"
#define WIDTH 128
#define HEIGHT 160
#define BUFFER_SIZE 10000
#define MAX_FILE_SIZE 2000000
#define WS_PATH "/ws?id=" ID "&width=" STR(WIDTH) "&height=" STR(HEIGHT) "&bufferSize=" STR(BUFFER_SIZE) "&maxFileSize=" STR(MAX_FILE_SIZE)

//WiFi/WS connection vars
WebSocketsClient webSocket;
const char *ssid     = "SSID";              //REPLACE WITH YOUR SSID
const char *password = "PASSWORD";          //REPLACE WITH YOUR WIFI PASS
const char* WS_HOST = "HOST_ADDRESS";       //REPLACE WITH YOUR WS HOST
const int   WS_PORT = 8080;                 //REPLACE WITH YOUR WS PORT
bool connected = false;
uint16_t seqnum = 0;

//Display vars
File gifFile;
const char* GIF_FILE_NAME = "/gif.gif";
bool isGifFileOpen = false;
bool isGifActive = false;
bool loadingData = false;
bool readyForNextPacket = false;

void setup() {
    tft.init();
    Serial.begin(115200);
    Serial.println(WS_PATH);
    if (!LittleFS.begin()) {
      Serial.println("Failed to mount LittleFS");
      return;
    }
    
    pinMode(ONBOARD_LED, OUTPUT);
    
    for(uint8_t t = 3; t > 0; t--) {
        Serial.printf("[SETUP] BOOT WAIT %d...\n", t);
        Serial.flush();
        delay(1000);
    }
    Serial.println(WiFi.macAddress());

    //Connect to WiFi
    WiFi.begin(ssid, password);
    while(WiFi.status() != WL_CONNECTED){
      delay(500);
      Serial.print(".");
    }
    Serial.print("Local IP: "); Serial.println(WiFi.localIP());
    delay(50);

    //Set up web socket connection
    webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
    webSocket.onEvent(webSocketEvent);

    gif.begin(BIG_ENDIAN_PIXELS);
}


void loop() {
  webSocket.loop();
  if(isGifActive && !isGifFileOpen && !loadingData){
    if(gif.open(GIF_FILE_NAME, GIFOpenFile, GIFCloseFile, GIFReadFile, GIFSeekFile, GIFDraw)){
      while(gif.playFrame(true, NULL)) {
        yield();
      }    
      gif.close();
    } else {
      Serial.println("ERROR: Failed to load GIF file");
    }
  }

  if(connected && loadingData && readyForNextPacket){
    readyForNextPacket = false;
    webSocket.sendBIN((uint8_t*)&seqnum, sizeof(seqnum));
  }
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[WS] Disconnected!\n");
      connected = false;
      loadingData = false;
      break;
    case WStype_CONNECTED: 
      Serial.printf("[WS] Connected to url: %s\n", payload);
      connected = true;
      seqnum = 0;
      break;
        
    case WStype_TEXT:
      Serial.printf("[WS] Received text: %s\n", payload);
      break;
        
    case WStype_BIN:
      uint16_t* msgData = (uint16_t*)payload;
      seqnum++;

      // First 2 bytes are msg type
      uint16_t msgType = msgData[0];

      // Handle message
      switch(msgType){
        case NEW_MSG:
          Serial.println("New image/gif data is available!");
          seqnum = 0;
          loadingData = true;
          break;
        case GIF_MSG:
          openGifFile();
          Serial.printf("> Writing %d bytes to GIF file\n", length-2);
          gifFile.write(payload + 2, length - 2);
          isGifActive = true;
          break;
        case IMG_MSG:
          Serial.println("> Processing image data");
          tft.pushImage(msgData[1], msgData[2], msgData[3], msgData[4], msgData + 5);
          isGifActive = false;
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

void openGifFile(){
  if(!isGifFileOpen){
    clearGifFile();
    Serial.println("Opening GIF file for writing");
    gifFile = LittleFS.open(GIF_FILE_NAME, "a");
    isGifFileOpen = true;
  }
}

void closeGifFile(){
  if(isGifFileOpen){
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


///////////////////////////
// AnimatedGIF Callbacks //
///////////////////////////
void* GIFOpenFile(const char *filename, int32_t *pSize){
  gifFile = LittleFS.open(filename, "r");
  *pSize = gifFile.size();
  return (void*)&gifFile;
}

void GIFCloseFile(void *pHandle) {
  File *f = static_cast<File *>(pHandle);
  if (f != NULL)
     f->close();
}

int32_t GIFReadFile(GIFFILE *pFile, uint8_t *pBuf, int32_t iLen) {
    int32_t iBytesRead;
    iBytesRead = iLen;
    File *f = static_cast<File *>(pFile->fHandle);
    // Note: If you read a file all the way to the last byte, seek() stops working
    if ((pFile->iSize - pFile->iPos) < iLen)
       iBytesRead = pFile->iSize - pFile->iPos - 1; // <-- ugly work-around
    if (iBytesRead <= 0)
       return 0;
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

void GIFDraw(GIFDRAW *pDraw)
{
  uint8_t *s;
  uint16_t *d, *usPalette, usTemp[320];
  int x, y, iWidth;

  iWidth = pDraw->iWidth;
  if (iWidth > 128)
      iWidth = 128;
  usPalette = pDraw->pPalette;
  y = pDraw->iY + pDraw->y; // current line

  s = pDraw->pPixels;
  if (pDraw->ucDisposalMethod == 2) {// restore to background color
    for (x=0; x<iWidth; x++) {
      if (s[x] == pDraw->ucTransparent)
          s[x] = pDraw->ucBackground;
    }
    pDraw->ucHasTransparency = 0;
  }
  // Apply the new pixels to the main image
  if (pDraw->ucHasTransparency) { // if transparency used
    uint8_t *pEnd, c, ucTransparent = pDraw->ucTransparent;
    int x, iCount;
    pEnd = s + iWidth;
    x = 0;
    iCount = 0; // count non-transparent pixels
    while(x < iWidth) {
      c = ucTransparent-1;
      d = usTemp;
      while (c != ucTransparent && s < pEnd) {
        c = *s++;
        if (c == ucTransparent) { // done, stop
          s--; // back up to treat it like transparent
        } else { // opaque
            *d++ = usPalette[c];
            iCount++;
        }
      } // while looking for opaque pixels
      if (iCount) { // any opaque pixels?
        tft.pushRect(pDraw->iX+x, y, iCount, 1, (uint16_t*)usTemp );
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
        x += iCount; // skip these
        iCount = 0;
      }
    }
  } else {
    s = pDraw->pPixels;
    // Translate the 8-bit pixels through the RGB565 palette (already byte reversed)
    for (x=0; x<iWidth; x++)
      usTemp[x] = usPalette[*s++];
    tft.pushRect(pDraw->iX, y, iWidth, 1, (uint16_t*)usTemp );
  }
}