<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\DBAL\Schema\SchemaException;
use Mautic\IntegrationsBundle\Migration\AbstractMigration;

/**
 * Adds linked blocks: `is_linked` marks a block as referenced rather than copied, and
 * `compiled_html` holds the email-safe HTML injected at send time for those blocks.
 *
 * Existing blocks stay copy blocks (is_linked = 0) and are untouched.
 */
class Version_2_3_0 extends AbstractMigration
{
    private string $table = 'friendly_content_blocks';

    protected function isApplicable(Schema $schema): bool
    {
        try {
            return !$schema->getTable($this->concatPrefix($this->table))->hasColumn('is_linked');
        } catch (SchemaException) {
            return false;
        }
    }

    protected function up(): void
    {
        $blocks = $this->concatPrefix($this->table);

        $this->addSql("ALTER TABLE `{$blocks}` ADD `is_linked` TINYINT(1) NOT NULL DEFAULT 0 AFTER `theme`");
        $this->addSql("ALTER TABLE `{$blocks}` ADD `compiled_html` LONGTEXT DEFAULT NULL AFTER `is_linked`");

        // Resolving a token loads every published linked block in one query; this keeps it an index scan.
        $this->addSql("CREATE INDEX `cb_linked_published` ON `{$blocks}` (`is_linked`, `is_published`)");
    }
}
