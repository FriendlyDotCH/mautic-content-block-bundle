<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\DBAL\Schema\SchemaException;
use Mautic\IntegrationsBundle\Migration\AbstractMigration;

/**
 * Drops the legacy free-text cb_category column now that blocks use
 * the built-in CategoryBundle relation (category_id).
 */
class Version_2_1_1 extends AbstractMigration
{
    private string $table = 'friendly_content_blocks';

    protected function isApplicable(Schema $schema): bool
    {
        try {
            return $schema->getTable($this->concatPrefix($this->table))->hasColumn('cb_category');
        } catch (SchemaException) {
            return false;
        }
    }

    protected function up(): void
    {
        $blocks = $this->concatPrefix($this->table);
        $this->addSql("ALTER TABLE `{$blocks}` DROP COLUMN `cb_category`");
    }
}
