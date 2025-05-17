#ifndef UltrasonicSensor_h
#define UltrasonicSensor_h
#include "Arduino.h" 
class UltrasonicSensor {
public:
	UltrasonicSensor(int trigPin, int echoPin, float height);
    void sense();
    void setTankHeight(float height);
    void reset();
	int getPercentage(int iterations = 10);
    double percentage;
    bool isDisabled = false, isSensorErrorDetected = false;
private:
	int _trigPin, _echoPin, _sensorErrorRate;
    int _lastPercentage[10] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
    float _tankHeightMeters, _distanceMeters = 0;
    bool _isFirstBoot = true;
};
#endif