#ifndef SmartFlowTank_h
#define SmartFlowTank_h
#include "Arduino.h" 
class SmartFlowTank {
public:
    SmartFlowTank(int min, int max, int tol, String name, bool isActive = true);
    void init(int min, int max, int tol, String name, bool isActive = true);
    void loop(double percentage);
    int min, max, tol;
    bool isActive = true, tolCondition = false;
    String name;
    String reason;
    String smartFlowPumpState;
};
#endif