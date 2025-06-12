import { PrismaService } from './prisma/prisma.service';
interface Pageable {
    page?: number;
    limit?: number;
}
export declare class AppService {
    private prisma;
    constructor(prisma: PrismaService);
    getProductsWithDaysAndGiro({ page, limit, importer, code, alerta, giroMin, giroMax, }: {
        code?: string;
        importer?: string;
        alerta?: number;
        giroMin?: number;
        giroMax?: number;
    } & Pageable): Promise<({
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
    getProductsWithDaysGalpao({ page, limit, importer, code, alerta, }: {
        code?: string;
        importer?: string;
        alerta?: number;
    } & Pageable): Promise<({
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
    getProductsWithDaysLoja({ page, limit, importer, code, alerta, }: {
        code?: string;
        importer?: string;
        alerta?: number;
    } & Pageable): Promise<({
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
}
export {};
