-- CreateTable
CREATE TABLE `controllers` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lote_container` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_groups` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `group_ID` INTEGER NOT NULL,
    `controller_ID` INTEGER NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `write` BOOLEAN NOT NULL DEFAULT false,
    `delete` BOOLEAN NOT NULL DEFAULT false,
    `edit` BOOLEAN NULL DEFAULT false,

    INDEX `controller_ID`(`controller_ID`),
    INDEX `group_ID`(`group_ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `description` VARCHAR(255) NULL,
    `chinese_description` VARCHAR(255) NULL,
    `importer` VARCHAR(30) NOT NULL,
    `ean` VARCHAR(13) NULL,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products_in_container` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `product_ID` INTEGER NOT NULL,
    `container_ID` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `quantity_expected` INTEGER NULL,
    `in_stock` BOOLEAN NULL DEFAULT true,
    `departure_date` DATE NULL,
    `arrival_date` DATE NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `container_ID`(`container_ID`),
    INDEX `product_ID`(`product_ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quantity_in_stock` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `product_ID` INTEGER NOT NULL,
    `stock_ID` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `quantity_in_reserve` INTEGER NOT NULL DEFAULT 0,
    `location` VARCHAR(50) NULL,
    `last_entries` VARCHAR(255) NULL,
    `entry_quantity` INTEGER NULL DEFAULT 0,

    INDEX `product_ID`(`product_ID`),
    INDEX `stock_ID`(`stock_ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reserves` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `product_ID` INTEGER NOT NULL,
    `stock_ID` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `client_name` VARCHAR(40) NOT NULL,
    `rescue_date` DATE NOT NULL,
    `observation` TEXT NULL,
    `confirmed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `product_ID`(`product_ID`),
    INDEX `stock_ID`(`stock_ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocks` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(15) NOT NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_types` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `type`(`type`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `product_ID` INTEGER NOT NULL,
    `from_stock_ID` INTEGER NULL,
    `to_stock_ID` INTEGER NULL,
    `type_ID` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `client_name` VARCHAR(65) NULL,
    `observation` VARCHAR(155) NULL,
    `operator_ID` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `from_stock_ID`(`from_stock_ID`),
    INDEX `operator_ID`(`operator_ID`),
    INDEX `product_ID`(`product_ID`),
    INDEX `to_stock_ID`(`to_stock_ID`),
    INDEX `type_ID`(`type_ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions_history` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `product_ID` INTEGER NOT NULL,
    `from_stock_ID` INTEGER NULL,
    `to_stock_ID` INTEGER NULL,
    `type_ID` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `client_name` VARCHAR(65) NULL,
    `observation` VARCHAR(155) NULL,
    `operator_ID` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `from_stock_ID`(`from_stock_ID`),
    INDEX `product_ID`(`product_ID`),
    INDEX `to_stock_ID`(`to_stock_ID`),
    INDEX `type_ID`(`type_ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transferences` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `product_ID` INTEGER NOT NULL,
    `from_stock_ID` INTEGER NOT NULL,
    `to_stock_ID` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `location` VARCHAR(255) NULL,
    `observation` VARCHAR(255) NULL,
    `confirmed` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `from_stock_ID`(`from_stock_ID`),
    INDEX `product_ID`(`product_ID`),
    INDEX `to_stock_ID`(`to_stock_ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `ID` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(30) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `active` BOOLEAN NULL DEFAULT false,
    `group_ID` INTEGER NULL DEFAULT 99,

    UNIQUE INDEX `username`(`username`),
    UNIQUE INDEX `email`(`email`),
    INDEX `group_ID`(`group_ID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products_in_container` ADD CONSTRAINT `products_in_container_ibfk_1` FOREIGN KEY (`product_ID`) REFERENCES `products`(`ID`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quantity_in_stock` ADD CONSTRAINT `quantity_in_stock_ibfk_1` FOREIGN KEY (`product_ID`) REFERENCES `products`(`ID`) ON DELETE CASCADE ON UPDATE NO ACTION;
