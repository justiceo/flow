// jest.config.js
export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',                  
    extensionsToTreatAsEsm: ['.ts'],         
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$', 
    moduleFileExtensions: ['ts', 'js', 'json', 'node'], 
  };
  

