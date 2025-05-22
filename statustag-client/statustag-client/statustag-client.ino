//WS Tutorial https://www.mischianti.org/2020/12/07/websocket-on-arduino-esp8266-and-esp32-client-1/ 
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>   //Requires WebSockets library by Markus Sattler
#include <LovyanGFX.hpp>
#include <FS.h>

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
      cfg.rgb_order        = 1;      // 0 = RGB, 1 = BGR
      cfg.bus_shared       = false;

      _panel_instance.config(cfg);
    }

    setPanel(&_panel_instance);
  }
};

LGFX_ST7735 tft;

// Device properties
// #define ID "finally"
// #define WIDTH 128
// #define HEIGHT 160
// #define BUFFER_SIZE 2000

// #define WS_PATH TOSTRING("/ws?id=" ID "&width=" TOSTRING(WIDTH) "&height=" TOSTRING(HEIGHT) "&bufferSize=" TOSTRING(BUFFER_SIZE))

// Incoming message types
#define DATA_MSG 1
#define DELAY_MSG 2
#define EOF_MSG 3

// Pins
#define ONBOARD_LED 2

//WiFi/WS connection vars
WebSocketsClient webSocket;
const char *ssid     = "***REMOVED***";                   //REPLACE WITH YOUR SSID
const char *password = "***REMOVED***";                   //REPLACE WITH YOUR WIFI PASS
const char* WS_HOST = "***REMOVED***";   //REPLACE WITH YOUR WS HOST
const int   WS_PORT = 8080;                        //REPLACE WITH YOUR WS PORT
const char* WS_PATH = "/ws?id=finally&width=128&height=160&bufferSize=8000000";
const char* DISPLAY_ID = "6366198fcb26bf86050e4ea8";                   //REPLACE WITH YOUR DEVICE ID
bool connected = false;

//Display vars
uint16_t currentDelay = 0;
long frameStartTime = 0;
bool readyForNextPatch = true;
uint16_t seqnum = 0;
 
// Macros
#define DEBUG_SERIAL Serial

void setup() {
    tft.init();
    DEBUG_SERIAL.begin(115200);
    DEBUG_SERIAL.println(WS_PATH);
    Serial.println(ESP.getFreeHeap());
    if (!SPIFFS.begin()) {
      Serial.println("Failed to mount SPIFFS");
      return;
    }

    FSInfo fs_info;
    SPIFFS.info(fs_info);

    Serial.print("Total SPIFFS bytes: ");
    Serial.println(fs_info.totalBytes);

    Serial.print("Used SPIFFS bytes: ");
    Serial.println(fs_info.usedBytes);

    Serial.print("Free SPIFFS bytes: ");
    Serial.println(fs_info.totalBytes - fs_info.usedBytes);
    
    pinMode(ONBOARD_LED, OUTPUT);
    
    for(uint8_t t = 3; t > 0; t--) {
        DEBUG_SERIAL.printf("[SETUP] BOOT WAIT %d...\n", t);
        DEBUG_SERIAL.flush();
        delay(1000);
    }
    DEBUG_SERIAL.println(WiFi.macAddress());

    //Connect to WiFi
    WiFi.begin(ssid, password);
    while(WiFi.status() != WL_CONNECTED){
      delay(500);
      Serial.print(".");
    }
    DEBUG_SERIAL.print("Local IP: "); DEBUG_SERIAL.println(WiFi.localIP());
    delay(50);

    //Set up web socket connection
    webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
    webSocket.onEvent(webSocketEvent);
}


void loop() {
  webSocket.loop();
  if(connected && readyForNextPatch && (seqnum == 0 || millis() > frameStartTime + currentDelay)){
    readyForNextPatch = false;
    frameStartTime = millis();
    webSocket.sendBIN((uint8_t*)&seqnum, sizeof(seqnum));
  }
}


void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  int numBytesRead = 0;
  switch(type) {
    case WStype_DISCONNECTED:
      DEBUG_SERIAL.printf("[WS] Disconnected!\n");
      connected = false;
      break;
    case WStype_CONNECTED: 
      DEBUG_SERIAL.printf("[WS] Connected to url: %s\n", payload);
      connected = true;
      seqnum = 0;
      readyForNextPatch = true;
      break;
        
    case WStype_TEXT:
      DEBUG_SERIAL.printf("[WS] Received text: %s\n", payload);
      break;
        
    case WStype_BIN:
      uint16_t* msgData = (uint16_t*)payload;
      seqnum++;
      readyForNextPatch = true;

      // First 2 bytes are msg type
      uint16_t msgType = msgData[0];

      // Handle message
      switch(msgType){
        case DATA_MSG:
          tft.pushImage(msgData[1], msgData[2], msgData[3], msgData[4], msgData + 5, 0xFFFE);
          break;
        case DELAY_MSG:
          currentDelay = msgData[1];
          break;
        case EOF_MSG:
          seqnum = 0;
          break;
      }
      break;
  }
}
