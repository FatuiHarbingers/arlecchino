-- CreateTable
CREATE TABLE `Profile` (
    `avatar` VARCHAR(255) NULL,
    `color` INTEGER NULL DEFAULT 44225,
    `name` VARCHAR(255) NULL,
    `type` ENUM('Default', 'Discussions', 'LogEvents', 'RecentChanges') NOT NULL,
    `configurationGuild` VARCHAR(255) NOT NULL,
    `configurationWiki` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `Profile_configurationGuild_configurationWiki_type_key`(`configurationGuild`, `configurationWiki`, `type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Configurations` (
    `channel` VARCHAR(255) NOT NULL,
    `guild` VARCHAR(255) NOT NULL,
    `wiki` VARCHAR(255) NOT NULL,
    `guildSnowflake` VARCHAR(255) NULL,

    PRIMARY KEY (`guild`, `wiki`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guilds` (
    `limit` INTEGER NULL DEFAULT 1,
    `snowflake` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`snowflake`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_configurationGuild_configurationWiki_fkey` FOREIGN KEY (`configurationGuild`, `configurationWiki`) REFERENCES `Configurations`(`guild`, `wiki`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Configurations` ADD CONSTRAINT `Configurations_guildSnowflake_fkey` FOREIGN KEY (`guildSnowflake`) REFERENCES `Guilds`(`snowflake`) ON DELETE SET NULL ON UPDATE CASCADE;
