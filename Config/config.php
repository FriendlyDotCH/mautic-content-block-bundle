<?php

declare(strict_types=1);

return [
    'name'        => 'Content Blocks',
    'description' => 'Reusable saved content blocks for the GrapesJS page/email builder.',
    'version'     => '2.6.0',
    'author'      => 'Friendly Automate',

    'routes' => [
        'main' => [
            'mautic_contentblock_editor_list' => [
                'path'       => '/content-blocks/editor',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockGrapeController::class.'::getBlocksAction',
                'method'     => 'GET',
            ],
            'mautic_contentblock_editor_save' => [
                'path'       => '/content-blocks/editor',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockGrapeController::class.'::postBlockAction',
                'method'     => 'POST',
            ],
            'mautic_contentblock_editor_update' => [
                'path'         => '/content-blocks/editor/{id}',
                'controller'   => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockGrapeController::class.'::patchBlockAction',
                'method'       => 'POST',
                'requirements' => ['id' => '\d+'],
            ],
            'mautic_contentblock_editor_delete' => [
                'path'         => '/content-blocks/editor/{id}',
                'controller'   => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockGrapeController::class.'::deleteBlockAction',
                'method'       => 'DELETE',
                'requirements' => ['id' => '\d+'],
            ],
            'mautic_contentblock_editor_linked' => [
                'path'       => '/content-blocks/editor/linked',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockGrapeController::class.'::linkedBlocksAction',
                'method'     => 'GET',
            ],
            'mautic_contentblock_editor_theme' => [
                'path'         => '/content-blocks/editor/theme/{theme}',
                'controller'   => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockGrapeController::class.'::themeAction',
                'method'       => 'GET',
                'requirements' => ['theme' => '[A-Za-z0-9_-]+'],
            ],

            'mautic_contentblock_index' => [
                'path'       => '/content-blocks/{page}',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockController::class.'::indexAction',
                'defaults'   => ['page' => 1],
            ],
            'mautic_contentblock_action' => [
                'path'       => '/content-blocks/{objectAction}/{objectId}',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockController::class.'::executeAction',
                'defaults'   => ['objectId' => 0],
            ],
        ],
    ],

    'menu' => [
        'main' => [
            'mautic.contentblock.menu.index' => [
                'route'    => 'mautic_contentblock_index',
                'parent'   => 'mautic.core.components',
                'priority' => 60,
            ],
        ],
    ],

    'categories' => [
        'content_block' => 'mautic.contentblock.menu.index',
    ],

    'services' => [],

    'parameters' => [
        // Seconds a sending process keeps linked blocks in memory before re-reading them.
        // Only matters for long-running workers; cron runs are separate processes anyway.
        'content_block_cache_ttl' => 60,
    ],
];
