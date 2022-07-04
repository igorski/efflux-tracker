/**
 * An ease in function to be called over time on each iteration of the animation
 *
 * @param {number} currentStep define at what point in the animation we are (e.g. this defines current time)
 * @param {number} totalSteps total amount of steps the animation will take (e.g. duration)
 * @param {number} startValue the initial value
 * @param {number} endValue the final value we will ease to
 * @return {number} the eased value for the currentStep
 */
export const easeIn = ( currentStep: number, totalSteps: number, startValue = 0, endValue = 1 ): number => {
    return ( currentStep === 0 ) ? startValue : endValue * Math.pow( 2, 10 * ( currentStep / totalSteps - 1 )) + startValue;
};
