<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\DBAL\Schema\SchemaException;
use Mautic\IntegrationsBundle\Migration\AbstractMigration;

/**
 * Switches content blocks over to Mautic's built-in CategoryBundle:
 *  - seeds a single "General" category scoped to the content_block bundle,
 *  - adds the category_id FK column,
 *  - backfills existing rows to General.
 */
class Version_2_1_0 extends AbstractMigration
{
    private string $table = 'friendly_content_blocks';

    protected function isApplicable(Schema $schema): bool
    {
        try {
            return !$schema->getTable($this->concatPrefix($this->table))->hasColumn('category_id');
        } catch (SchemaException) {
            return false;
        }
    }

    protected function up(): void
    {
        $blocks     = $this->concatPrefix($this->table);
        $categories = $this->concatPrefix('categories');
        $fkName     = substr('FK_'.dechex(crc32($blocks)).'_category', 0, 63);

        // 1. Seed the single General category (idempotent).
        $this->addSql("
            INSERT INTO `{$categories}` (`is_published`, `date_added`, `title`, `alias`, `bundle`)
            SELECT 1, NOW(), 'General', 'general', 'content_block'
            FROM DUAL
            WHERE NOT EXISTS (
                SELECT 1 FROM `{$categories}`
                WHERE `bundle` = 'content_block' AND `alias` = 'general'
            )
        ");

        // 2. Add the FK column.
        $this->addSql("ALTER TABLE `{$blocks}` ADD `category_id` INT UNSIGNED DEFAULT NULL AFTER `name`");

        // 3. Backfill every existing block to General.
        $this->addSql("
            UPDATE `{$blocks}`
            SET `category_id` = (
                SELECT `id` FROM `{$categories}`
                WHERE `bundle` = 'content_block' AND `alias` = 'general'
                LIMIT 1
            )
            WHERE `category_id` IS NULL
        ");

        // 4. Add the foreign key constraint.
        $this->addSql("
            ALTER TABLE `{$blocks}`
            ADD CONSTRAINT `{$fkName}`
            FOREIGN KEY (`category_id`) REFERENCES `{$categories}` (`id`) ON DELETE SET NULL
        ");
    }
}
