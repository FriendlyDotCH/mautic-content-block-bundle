<?php

declare(strict_types=1);

return [
    'name'        => 'Content Blocks',
    'description' => 'Reusable saved content blocks for the GrapesJS page/email builder.',
    'version'     => '1.0.0',
    'author'      => 'Friendly Automate',

    'routes' => [
        'main' => [
            'mautic_contentblock_index' => [
                'path'       => '/content-blocks/{page}',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockController::class.'::indexAction',
                'defaults'   => ['page' => 1],
            ],
            'mautic_contentblock_delete' => [
                'path'       => '/content-blocks/delete/{objectId}',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockController::class.'::deleteAction',
                'requirements' => ['objectId' => '\d+'],
                'methods'    => ['POST'],
            ],
            'mautic_contentblock_toggle' => [
                'path'       => '/content-blocks/toggle/{objectId}',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockController::class.'::toggleAction',
                'requirements' => ['objectId' => '\d+'],
                'methods'    => ['POST'],
            ],
            'mautic_contentblock_edit_inline' => [
                'path'       => '/content-blocks/edit/{objectId}',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockController::class.'::editAction',
                'requirements' => ['objectId' => '\d+'],
                'methods'    => ['POST'],
            ],
            'mautic_contentblock_list_ajax' => [
                'path'       => '/content-blocks/list',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockApiController::class.'::listAction',
            ],
            'mautic_contentblock_save' => [
                'path'       => '/content-blocks/save',
                'controller' => MauticPlugin\MauticContentBlockBundle\Controller\ContentBlockApiController::class.'::saveAction',
                'methods'    => ['POST'],
            ],
        ],
    ],

    'menu' => [
        'main' => [
            // Use a plain readable string as key — Mautic will try to translate it,
            // fall back to the key itself, which is already human-readable.
            'Content Blocks' => [
                'route'    => 'mautic_contentblock_index',
                'parent'   => 'mautic.core.components',
                'priority' => 60,
            ],
        ],
    ],

    'services' => [],

    'assets' => [
        'js' => [
            'plugins/MauticContentBlockBundle/Assets/js/contentblocks.grapesjs.js',
        ],
    ],

    'doctrine' => [
        'mappings' => [
            'MauticContentBlockBundle' => [
                'is_bundle' => false,
                'type'      => 'staticphp',
                'dir'       => '%kernel.project_dir%/plugins/MauticContentBlockBundle/Entity',
                'prefix'    => 'MauticPlugin\\MauticContentBlockBundle\\Entity',
            ],
        ],
    ],

    'parameters' => [],
];
