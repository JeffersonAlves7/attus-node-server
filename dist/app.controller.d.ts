import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    products(page: number, limit: number, alerta: number, importer?: string, code?: string, giroMin?: number, giroMax?: number): Promise<({
        quantity_in_stock: {
            ID: number;
            product_ID: number;
            stock_ID: number;
            quantity: number;
            quantity_in_reserve: number;
            location: string | null;
            last_entries: string | null;
            entry_quantity: number | null;
        }[];
    } & {
        importer: string;
        code: string;
        ID: number;
        description: string | null;
        chinese_description: string | null;
        ean: string | null;
        is_active: boolean | null;
        created_at: Date;
        giro_percentual: number | null;
    })[]>;
    productsByStock(stock: string, page: number, limit: number, alerta: number, importer?: string, code?: string): Promise<({
        quantity_in_stock: {
            ID: number;
            product_ID: number;
            stock_ID: number;
            quantity: number;
            quantity_in_reserve: number;
            location: string | null;
            last_entries: string | null;
            entry_quantity: number | null;
        }[];
    } & {
        importer: string;
        code: string;
        ID: number;
        description: string | null;
        chinese_description: string | null;
        ean: string | null;
        is_active: boolean | null;
        created_at: Date;
        giro_percentual: number | null;
    })[]> | undefined;
}
