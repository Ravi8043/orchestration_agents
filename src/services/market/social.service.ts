export interface SocialData {
  sentimentScore: number;
  mentionVolume: number;
  bullishPct: number;
  dataSource: string;
}

export class SocialService {
  async getSocialData(_ticker: string): Promise<SocialData> {
    const sentiment = 0.35 + Math.random() * 0.45;
    const mentionVolume = 200 + Math.floor(Math.random() * 600);
    const bullishPct = 50 + Math.random() * 40;

    return {
      sentimentScore: Number(sentiment.toFixed(2)),
      mentionVolume,
      bullishPct: Number(bullishPct.toFixed(1)),
      dataSource: "mock"
    };
  }
}
