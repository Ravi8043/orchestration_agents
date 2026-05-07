declare module "finnhub" {
    export class DefaultApi {
        quote(
            symbol: string,
            callback: (
                error: any,
                data: any,
                response: any
            ) => void
        ): void;
    }

    export class ApiClient {
        static instance: {
            authentications: {
                api_key: {
                    apiKey: string;
                };
            };
        };
    }

    const finnhub: {
        DefaultApi: typeof DefaultApi;
        ApiClient: typeof ApiClient;
    };

    export default finnhub;
}