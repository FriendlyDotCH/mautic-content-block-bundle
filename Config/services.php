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

    // Explicit DBAL connection since Symfony can't disambiguate Connection by type alone.
    $services->set(MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockApiController::class)
        ->arg('$db', service('doctrine.dbal.default_connection'));

    /*/$services->set(MauticPlugin\MauticContentBlockBundle\Service\ContentBlockService::class)
        ->arg('$db', service('doctrine.dbal.default_connection'));*/

    $services->set('mautic.content_block.model.content_block', MauticPlugin\MauticContentBlockBundle\Model\ContentBlockModel::class);
};
