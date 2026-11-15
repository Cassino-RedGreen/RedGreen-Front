export default {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
        },
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@ui/(.*)$': '<rootDir>/src/presentation/ui/$1',
    '^@games/(.*)$': '<rootDir>/src/presentation/games/$1',
  },
  // Cobertura medida so sobre a regra de negocio (criterio do professor); telas e PixiJS ficam fora.
  // useCardRewardController e RewardCardSelection nao entram: nenhuma tela os usa, o Gambit
  // monta a recompensa pelo GambitPendingEventRewardAdapter a partir do backend.
  collectCoverageFrom: [
    'src/application/**/*.{ts,tsx}',
    'src/domain/**/*.ts',
    'src/validators.ts',
    'src/presentation/games/GambitGame/GambitApi.ts',
    'src/presentation/games/GambitGame/GambitAutoCashOut.ts',
    'src/presentation/games/GambitGame/GambitEffectCardAssets.ts',
    'src/presentation/games/GambitGame/GambitEffectPresentation.ts',
    'src/presentation/games/GambitGame/GambitGameConfig.ts',
    'src/presentation/games/GambitGame/GambitGameplayClient.ts',
    'src/presentation/games/GambitGame/GambitMapper.ts',
    'src/presentation/games/GambitGame/GambitPendingEventRewardAdapter.ts',
    'src/presentation/games/GambitGame/GambitRevealNature.ts',
    'src/presentation/games/GambitGame/GambitTableConfig.ts',
    'src/presentation/games/SlotMachineGame/SlotMachineApi.ts',
    'src/presentation/games/SlotMachineGame/SlotMachineGameConfig.ts',
    'src/presentation/games/SlotMachineGame/SlotPaytable.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
