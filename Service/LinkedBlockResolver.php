<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Service;

use Mautic\CoreBundle\Helper\CoreParametersHelper;
use Mautic\EmailBundle\Helper\PlainTextHelper;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlockRepository;

/**
 * Loads every published linked block ONCE per process (one query) and keeps it in memory,
 * so a broadcast to 100k contacts costs one query rather than 100k.
 *
 * The cache is dropped after `content_block_cache_ttl` seconds so long-running messenger
 * workers pick up edits made by another process.
 */
class LinkedBlockResolver
{
    /**
     * id => ['name' => string, 'icon' => ?string, 'html' => string, 'text' => ?string].
     *
     * @var array<int, array{name: string, icon: ?string, html: string, text: ?string}>|null
     */
    private ?array $blocks = null;

    private int $loadedAt = 0;

    public function __construct(
        private ContentBlockRepository $repository,
        private CoreParametersHelper $coreParametersHelper
    ) {
    }

    public function resolveHtml(int $id): ?string
    {
        return $this->getBlocks()[$id]['html'] ?? null;
    }

    public function resolveText(int $id): ?string
    {
        $blocks = $this->getBlocks();
        if (!isset($blocks[$id])) {
            return null;
        }

        if (null === $this->blocks[$id]['text']) {
            // Converted lazily and cached: once per block, not once per recipient.
            $html                     = $this->blocks[$id]['html'];
            $this->blocks[$id]['text'] = '' === $html ? '' : (new PlainTextHelper())->setHtml($html)->getText();
        }

        return $this->blocks[$id]['text'];
    }

    /**
     * Everything the GrapesJS canvas needs to draw linked blocks in place.
     *
     * @return array<int, array{id: int, name: string, icon: ?string, html: string}>
     */
    public function getBuilderData(): array
    {
        $data = [];
        foreach ($this->getBlocks() as $id => $block) {
            $data[$id] = ['id' => $id, 'name' => $block['name'], 'icon' => $block['icon'], 'html' => $block['html']];
        }

        return $data;
    }

    /**
     * Tokens for the builder's token list: '{contentblock=28}' => 'Linked block: Name'.
     *
     * @return array<string, string>
     */
    public function getBuilderTokens(): array
    {
        $tokens = [];
        foreach ($this->getBlocks() as $id => $block) {
            $tokens['{contentblock='.$id.'}'] = 'Linked block: '.$block['name'];
        }

        return $tokens;
    }

    public function reset(): void
    {
        $this->blocks   = null;
        $this->loadedAt = 0;
    }

    /**
     * @return array<int, array{name: string, icon: ?string, html: string, text: ?string}>
     */
    private function getBlocks(): array
    {
        $ttl = (int) $this->coreParametersHelper->get('content_block_cache_ttl', 60);

        if (null === $this->blocks || ($ttl > 0 && time() - $this->loadedAt > $ttl)) {
            $this->blocks = [];
            foreach ($this->repository->getPublishedLinked() as $row) {
                $this->blocks[$row['id']] = [
                    'name' => $row['name'],
                    'icon' => $row['icon'],
                    'html' => $row['compiled_html'],
                    'text' => null,
                ];
            }
            $this->loadedAt = time();
        }

        return $this->blocks;
    }
}
