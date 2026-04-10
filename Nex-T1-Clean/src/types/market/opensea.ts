export interface OpenSeaCollectionStats {
    total_volume: number;
    total_sales: number;
    total_supply: number;
    count: number;
    num_owners: number;
    average_price: number;
    num_reports: number;
    market_cap: number;
    floor_price: number;
}

export interface OpenSeaCollectionResponse {
    stats: OpenSeaCollectionStats;
}

export interface OpenSeaCollection {
    name: string;
    slug: string;
    description: string;
    image_url: string;
    banner_image_url: string;
    external_url: string;
    stats: OpenSeaCollectionStats;
}
