import type { EventCard } from '../types/game';

export const EVENT_CARDS: EventCard[] = [
  // --- バブル系 ---
  {
    id: 'bubble_saas',
    title: 'SaaSバブル到来',
    description: 'エンタープライズSaaSへの投資が過熱。SaaSセクターは成長しやすいが、バリュエーションも高騰。',
    category: 'bubble',
    effects: [{ target: 'saas', growthModifier: +2, valuationModifier: 1.5 }],
  },
  {
    id: 'bubble_fintech',
    title: 'Fintechブーム',
    description: 'キャッシュレス決済の普及が加速。Fintechセクターに追い風。',
    category: 'bubble',
    effects: [{ target: 'fintech', growthModifier: +2, valuationModifier: 1.5 }],
  },
  {
    id: 'bubble_consumer',
    title: 'D2Cブーム',
    description: 'SNS発のブランドが急成長。Consumer領域のスタートアップが脚光を浴びる。',
    category: 'bubble',
    effects: [{ target: 'consumer', growthModifier: +2, valuationModifier: 1.5 }],
  },
  {
    id: 'bubble_cleantech',
    title: 'グリーンバブル',
    description: '各国政府がカーボンニュートラル政策を推進。CleanTechセクターに大量の資金が流入。',
    category: 'bubble',
    effects: [{ target: 'cleantech', growthModifier: +2, valuationModifier: 1.5 }],
  },

  // --- 冬の時代 ---
  {
    id: 'winter_01',
    title: '資金調達環境の悪化',
    description: '金利上昇と景気後退懸念で、スタートアップへの資金流入が減少。',
    category: 'winter',
    effects: [{ target: 'all', growthModifier: -1, specialEffect: 'deal_flow_reduce' }],
  },
  {
    id: 'winter_02',
    title: 'VC冬の時代',
    description: 'LP出資が冷え込み、新規ファンド組成が困難に。業界全体が縮小傾向。',
    category: 'winter',
    effects: [{ target: 'all', growthModifier: -1 }],
  },
  {
    id: 'winter_03',
    title: 'バリュエーション調整',
    description: '過大評価されていたスタートアップのダウンラウンドが相次ぐ。',
    category: 'winter',
    effects: [{ target: 'all', growthModifier: -1 }],
  },

  // --- 規制 ---
  {
    id: 'regulation_fintech',
    title: 'Fintech規制強化',
    description: '金融庁が暗号資産・決済領域の規制を強化。Fintechセクターに逆風。',
    category: 'regulation',
    effects: [{ target: 'fintech', growthModifier: -2 }],
  },
  {
    id: 'regulation_healthtech',
    title: '医療データ規制',
    description: '個人医療データの取り扱いに関する厳格な規制が施行。HealthTechに影響。',
    category: 'regulation',
    effects: [{ target: 'healthtech', growthModifier: -2 }],
  },
  {
    id: 'regulation_consumer',
    title: '個人情報保護法改正',
    description: 'ターゲティング広告の規制が強化。Consumerサービスの成長に逆風。',
    category: 'regulation',
    effects: [{ target: 'consumer', growthModifier: -2 }],
  },
  {
    id: 'regulation_deeptech',
    title: 'AI規制フレームワーク',
    description: '政府がAI利用に関する包括的な規制を発表。DeepTechスタートアップに影響。',
    category: 'regulation',
    effects: [{ target: 'deeptech', growthModifier: -2 }],
  },

  // --- ブレイクスルー ---
  {
    id: 'breakthrough_deeptech',
    title: 'AI技術革新',
    description: '基盤モデルの性能が飛躍的に向上。DeepTechセクターに追い風。',
    category: 'breakthrough',
    effects: [{ target: 'deeptech', growthModifier: +2 }],
  },
  {
    id: 'breakthrough_healthtech',
    title: '画期的新薬の承認',
    description: 'AIを活用した創薬が初の大型承認。HealthTechセクターへの期待が高まる。',
    category: 'breakthrough',
    effects: [{ target: 'healthtech', growthModifier: +2 }],
  },
  {
    id: 'breakthrough_saas',
    title: 'リモートワーク定着',
    description: 'リモートワークが完全に定着し、SaaS需要が恒常的に拡大。',
    category: 'breakthrough',
    effects: [{ target: 'saas', growthModifier: +2 }],
  },

  // --- Exit環境 ---
  {
    id: 'exit_01',
    title: 'IPOウィンドウ開放',
    description: '株式市場が好調でIPO環境が改善。このラウンドのExit判定に有利。',
    category: 'exit_window',
    effects: [{ target: 'all', growthModifier: 0 }],
  },
  {
    id: 'exit_02',
    title: 'M&Aラッシュ',
    description: '大手テック企業の買収意欲が旺盛。Exit機会が増加。',
    category: 'exit_window',
    effects: [{ target: 'all', growthModifier: 0 }],
  },

  // --- ブラックスワン ---
  {
    id: 'blackswan_01',
    title: '世界的リセッション',
    description: '景気後退が直撃。全セクター逆風、ポートフォリオ企業の20%が即死亡判定。',
    category: 'black_swan',
    effects: [{ target: 'all', growthModifier: -2, specialEffect: 'random_death' }],
  },
  {
    id: 'blackswan_02',
    title: 'パンデミック発生',
    description: '世界的なパンデミックが発生。サプライチェーンが混乱し、多くの企業が打撃を受ける。',
    category: 'black_swan',
    effects: [{ target: 'all', growthModifier: -2, specialEffect: 'random_death' }],
  },

  // --- LP圧力 ---
  {
    id: 'lp_01',
    title: 'LPからの早期回収要請',
    description: 'LPが資金回収を要求。Exit可能な案件は強制的にM&A Exitとなる。',
    category: 'lp_pressure',
    effects: [{ target: 'all', growthModifier: 0, specialEffect: 'force_ma_exit' }],
  },
  {
    id: 'lp_02',
    title: 'LP定期報告会',
    description: 'LPへの報告会で成果を求められる。プレッシャーが高まるが、直接的な影響は少ない。',
    category: 'lp_pressure',
    effects: [{ target: 'all', growthModifier: 0 }],
  },

  // --- 追加イベント（バランス用） ---
  {
    id: 'neutral_01',
    title: '平穏な1年',
    description: '特に大きな市場変動はなく、各社がそれぞれの事業に集中。',
    category: 'breakthrough',
    effects: [{ target: 'all', growthModifier: 0 }],
  },
  {
    id: 'bubble_healthtech',
    title: 'ヘルスケアブーム',
    description: '高齢化社会への対応として、HealthTech分野に巨額の投資が集中。',
    category: 'bubble',
    effects: [{ target: 'healthtech', growthModifier: +2, valuationModifier: 1.5 }],
  },
  {
    id: 'breakthrough_cleantech',
    title: '次世代バッテリー実用化',
    description: '全固体電池の商用化に成功。CleanTechセクターに革命的な追い風。',
    category: 'breakthrough',
    effects: [{ target: 'cleantech', growthModifier: +2 }],
  },
];
