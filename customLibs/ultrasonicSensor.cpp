#include "Arduino.h"
#include "ultrasonicSensor.h"
UltrasonicSensor::UltrasonicSensor(int trigPin, int echoPin, float height) {
    pinMode(trigPin, OUTPUT);
    pinMode(echoPin, INPUT);
	_trigPin = trigPin;
	_echoPin = echoPin;
    _tankHeightMeters = height;
}

void UltrasonicSensor::sense() {
    if (isDisabled) return;
    digitalWrite(_trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(_trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(_trigPin, LOW);
    
    long duration = pulseIn(_echoPin, HIGH);

    isSensorErrorDetected = duration == 0;
    _distanceMeters = duration * 0.034 / 2 / 100; // Adjusted conversion factor for meters
}
void UltrasonicSensor::setTankHeight(float height) {
    _tankHeightMeters = height;
}
void UltrasonicSensor::reset() {
    _isFirstBoot = true;
    isDisabled = false;
    isSensorErrorDetected = false;
}
int UltrasonicSensor::getPercentage(int iterations) {
    if (isSensorErrorDetected) {
        if (_sensorErrorRate >= 100) {
            if (!isDisabled) {
                Serial.println();
                Serial.println("Sensor Disconnected.");
                Serial.println();
            } 
            percentage = -1;
            isDisabled = true;
        } else {
            _sensorErrorRate += 10;
            percentage = _lastPercentage[iterations - 1];
            Serial.print("Sensor Error Rate: ");
            Serial.println(_sensorErrorRate);
        }
        return percentage;
    } else if (_sensorErrorRate >= 2) {
        _sensorErrorRate -= 2;
    } else {
        isDisabled = false;
        isSensorErrorDetected = false;
    }

    int sum = 0;
    percentage = 100 - constrain(_distanceMeters / _tankHeightMeters * 100, 0, 100);

    if (_isFirstBoot) {
        for (int i = 0; i < iterations; i++) {
            _lastPercentage[i] = percentage;
        }
        _isFirstBoot = false;
    }

    // Calculate the difference between the current and last percentage
    int percentageDiff = percentage - _lastPercentage[iterations - 1];

    // Check if the difference exceeds 20
    if (percentageDiff > 20) {
        percentage = _lastPercentage[iterations - 1] + 5;
    } else if (percentageDiff < -20) {
        percentage = _lastPercentage[iterations - 1] - 5;
    }

    for(int i = 0; i < iterations; i++) {
        if (i == iterations - 1) {
            _lastPercentage[iterations - 1] = percentage;
        } else {
            _lastPercentage[i] = _lastPercentage[i + 1];
        }
        
        sum += _lastPercentage[i];
    }

    percentage = static_cast<double>(sum) / iterations;
    
    return percentage;
}