export const BumisEffect = 'BUMIS_INFILTRADOS';

const EffectTitles: Record<string, string> = {
  ANULACAO_TOTAL: 'Anulacao Total',
  BUMIS_INFILTRADOS: 'Bumis Infiltrados',
  CABECINHA: 'Cabecinha',
  CHRIS_JOKER: 'Chris Joker',
  CLARIVIDENCIA: 'Clarividencia',
  COLORIDINHO: 'Coloridinho',
  CORINGA_DO_INATEL: 'Coringa do Inatel',
  DOBRO_DE_POTASSIO: 'Dobro de Potassio',
  HEADGEAR: 'Headgear',
  INVERSAO_GRAVITACIONAL: 'Inversao Gravitacional',
  JACKPOT: 'Jackpot',
  JONAS_JOKER: 'Jonas Joker',
  MELANCIDIO: 'Melancidio',
  MENTE_LISA: 'Mente Lisa',
  MOSCA_JOKER: 'Mosca Joker',
  PAO_COM_OQUE: 'Pao Com Oque',
  QUANTO_MAIS_MELHOR: 'Quanto Mais Melhor',
  QUANTO_MENOS_MELHOR: 'Quanto Menos Melhor',
  RATIMUNDIO: 'Ratimundio',
};

const BumisDisguiseTitles = [
  'Dobro de Potassio',
  'Anulacao Total',
  'Clarividencia',
  'Cabecinha',
  'Jackpot',
  'Quanto Mais Melhor',
];

export const GetExpectedEffectTitles = (Effect: string) => {
  if (Effect === BumisEffect) {
    return BumisDisguiseTitles;
  }

  const Title = EffectTitles[Effect];

  if (!Title) {
    throw new Error(`Unknown Gambit effect "${Effect}"`);
  }

  return [Title];
};
