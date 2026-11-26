<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\DBAL\Schema\SchemaException;
use Mautic\IntegrationsBundle\Migration\AbstractMigration;

/**
 * Drops the legacy free-text `category` column. Version_2_1_1 meant to do this but checked
 * for `cb_category`, a column that never existed, so `category` survived on every install.
 * Blocks use the built-in CategoryBundle relation (category_id) since 2.1.0.
 */
class Version_2_6_0 extends AbstractMigration
{
    private string $table = 'friendly_content_blocks';

    protected function isApplicable(Schema $schema): bool
    {
        try {
            return $schema->getTable($this->concatPrefix($this->table))->hasColumn('category');
        } catch (SchemaException) {
            return false;
        }
    }

    protected function up(): void
    {
        $blocks = $this->concatPrefix($this->table);
        $this->addSql("ALTER TABLE `{$blocks}` DROP COLUMN `category`");
    }
}
