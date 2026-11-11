<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\DBAL\Schema\SchemaException;
use Mautic\IntegrationsBundle\Migration\AbstractMigration;

/**
 * Adds the `theme` column: the email theme a block's MJML is compiled against
 * for the form preview. Existing blocks keep NULL, which previews without
 * theme styles - exactly how they behaved before.
 */
class Version_2_2_0 extends AbstractMigration
{
    private string $table = 'friendly_content_blocks';

    protected function isApplicable(Schema $schema): bool
    {
        try {
            return !$schema->getTable($this->concatPrefix($this->table))->hasColumn('theme');
        } catch (SchemaException) {
            return false;
        }
    }

    protected function up(): void
    {
        $blocks = $this->concatPrefix($this->table);
        $this->addSql("ALTER TABLE `{$blocks}` ADD `theme` VARCHAR(191) DEFAULT NULL AFTER `html_content`");
    }
}
