import { PrismaService } from 'src/prisma/prisma.service';
export declare class GiroService {
    private prisma;
    private readonly logger;
    private readonly batchSize;
    private updating;
    constructor(prisma: PrismaService);
    canUpdate(): boolean;
    atualizarGiroEmLotes(): Promise<void>;
    atualizarAgoraManual(): Promise<void>;
}
