<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\DBAL\Schema\SchemaException;
use Mautic\IntegrationsBundle\Migration\AbstractMigration;

class Version_1_0_1 extends AbstractMigration
{
    private string $table = 'content_blocks';

    protected function isApplicable(Schema $schema): bool
    {
        try {
            return !$schema->getTable($this->concatPrefix($this->table))->hasColumn('icon');
        } catch (SchemaException $e) {
            return false;
        }
    }

    protected function up(): void
    {
        $table = $this->concatPrefix($this->table);
        $this->addSql(
            "ALTER TABLE `{$table}` ADD `icon` VARCHAR(20) DEFAULT NULL AFTER `name`"
        );
    }
}
