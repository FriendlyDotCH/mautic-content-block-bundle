<?php

declare(strict_types=1);

use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

use function Symfony\Component\DependencyInjection\Loader\Configurator\service;

return function (ContainerConfigurator $configurator): void {
    $services = $configurator->services()
        ->defaults()
        ->autowire()
        ->autoconfigure()
        ->public();

    $excludes = [
        'Config',
        'Crate',
        'DataObject',
        'DependencyInjection',
        'DTO',
        'Entity',
        'Event',
        'Exception',
        'Migration',
        'Migrations',
        'Security',
        'Test',
        'Tests',
        'Views',

        '.devtools',
        '.env',
        'bin',
        'migrations_old',
    ];

    $services->load('MauticPlugin\\MauticContentBlockBundle\\', '../')
        ->exclude(
            '../{'.implode(',', $excludes).'}'
        );
    $services->load('MauticPlugin\\MauticContentBlockBundle\\Entity\\', '../Entity/*Repository.php');
    $services->load('MauticPlugin\\MauticContentBlockBundle\\DTO\\', '../DTO/*Request.php');

    // Legacy IntegrationHelper looks integrations up by this key; without it the settings row is never created.
    $services->alias('mautic.integration.contentblocks', MauticPlugin\MauticContentBlockBundle\Integration\ContentBlocksIntegration::class);

    $services->set('mautic.content_block.model.content_block', MauticPlugin\MauticContentBlockBundle\Model\ContentBlockModel::class);
};
