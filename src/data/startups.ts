import type { Sector, StartupHints } from '../types/game';

export interface StartupTemplate {
  name: string;
  sector: Sector;
}

// セクターごとのスタートアップ名テンプレート
export const STARTUP_TEMPLATES: StartupTemplate[] = [
  // SaaS
  { name: 'CloudBoard', sector: 'saas' },
  { name: 'DataPipe', sector: 'saas' },
  { name: 'WorkStream', sector: 'saas' },
  { name: 'SyncFlow', sector: 'saas' },
  { name: 'MetricHub', sector: 'saas' },
  { name: 'DocuForce', sector: 'saas' },
  { name: 'TeamPulse', sector: 'saas' },
  { name: 'ApiNest', sector: 'saas' },

  // Fintech
  { name: 'PayBridge', sector: 'fintech' },
  { name: 'LendTech', sector: 'fintech' },
  { name: 'CashFlow AI', sector: 'fintech' },
  { name: 'TrustVault', sector: 'fintech' },
  { name: 'NeoBank', sector: 'fintech' },
  { name: 'InsurTech X', sector: 'fintech' },
  { name: 'CryptoBase', sector: 'fintech' },
  { name: 'WealthPilot', sector: 'fintech' },

  // HealthTech
  { name: 'MediScan', sector: 'healthtech' },
  { name: 'GeneCure', sector: 'healthtech' },
  { name: 'CareLink', sector: 'healthtech' },
  { name: 'PharmaAI', sector: 'healthtech' },
  { name: 'VitalSign', sector: 'healthtech' },
  { name: 'BioNova', sector: 'healthtech' },
  { name: 'HealthMesh', sector: 'healthtech' },
  { name: 'MindCare', sector: 'healthtech' },

  // DeepTech
  { name: 'QuantumLeap', sector: 'deeptech' },
  { name: 'RoboForge', sector: 'deeptech' },
  { name: 'FusionCore', sector: 'deeptech' },
  { name: 'NeuralWorks', sector: 'deeptech' },
  { name: 'PhotonAI', sector: 'deeptech' },
  { name: 'OrbitalTech', sector: 'deeptech' },
  { name: 'NanoSys', sector: 'deeptech' },
  { name: 'CyberMind', sector: 'deeptech' },

  // Consumer
  { name: 'FoodBox', sector: 'consumer' },
  { name: 'StyleMatch', sector: 'consumer' },
  { name: 'TripCraft', sector: 'consumer' },
  { name: 'PlayNest', sector: 'consumer' },
  { name: 'PetPal', sector: 'consumer' },
  { name: 'FitLife', sector: 'consumer' },
  { name: 'LearnUp', sector: 'consumer' },
  { name: 'SocialBuzz', sector: 'consumer' },

  // CleanTech
  { name: 'SolarGrid', sector: 'cleantech' },
  { name: 'GreenDrive', sector: 'cleantech' },
  { name: 'CarbonZero', sector: 'cleantech' },
  { name: 'WindForce', sector: 'cleantech' },
  { name: 'AquaPure', sector: 'cleantech' },
  { name: 'EcoCharge', sector: 'cleantech' },
  { name: 'BioFuel X', sector: 'cleantech' },
  { name: 'GridStore', sector: 'cleantech' },
];

// Web Crypto API ベースの乱数（Math.random() の代わりに使用）
function secureRandom(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] / (0xFFFFFFFF + 1);
}

// ポテンシャルに基づくヒント生成
// 高ポテンシャルほど良いヒントが出やすいが、完全な相関ではない（駆け引き要素）
export function generateHints(potential: 1 | 2 | 3 | 4 | 5): StartupHints {
  const weightedPick = (goodWeight: number): 'A' | 'B' | 'C' => {
    const r = secureRandom() * 100;
    if (r < goodWeight) return 'A';
    if (r < goodWeight + (100 - goodWeight) / 2) return 'B';
    return 'C';
  };

  // ポテンシャルが高いほどA評価が出やすい
  const aWeight: Record<number, number> = {
    1: 10,
    2: 20,
    3: 35,
    4: 55,
    5: 75,
  };

  const w = aWeight[potential] ?? 35;

  return {
    teamQuality: weightedPick(w),
    marketSize: weightedPick(w),
    productReadiness: weightedPick(w),
  };
}
