#include "Arduino.h"
#include "SmartFlowTank.h"

SmartFlowTank::SmartFlowTank(int minArg, int maxArg, int tolArg, String nameArg, bool isActiveArg) {
    min = minArg;
    max = maxArg;
    tol = tolArg;
    name = nameArg;
    isActive = isActiveArg;
}
void SmartFlowTank::init(int minArg, int maxArg, int tolArg, String nameArg, bool isActiveArg) {
    min = minArg;
    max = maxArg;
    tol = tolArg;
    name = nameArg;
    isActive = isActiveArg;
}
void SmartFlowTank::loop (double percentage) {
    smartFlowPumpState = "";

    if (isActive) {
        if (tol >= 0) { // Positive values along with 0
            tolCondition = percentage >= tol; 

            reason = name;
            reason += " percentage ";
            reason += "> "; 
            reason += tol;
            reason += "%";
        } else if (tol < 0) { // Negative values
            tolCondition = percentage <= -tol; // --tol = +tol
            
            reason = name;
            reason += " percentage ";
            reason += "< ";
            reason += -tol;
            reason += "%";
        }

        if (percentage > max) {
            reason = name;
            reason += " percentage > ";
            reason += max;
            reason += "%";
            smartFlowPumpState = "OFF";
        }   
        if (percentage < min) {
            reason = name;
            reason += " percentage < ";
            reason += min;
            reason += "%";
            smartFlowPumpState = "OFF";
        }
    }
}