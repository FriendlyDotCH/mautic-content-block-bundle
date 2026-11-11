<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Service;

/**
 * Finds and replaces {contentblock=<id>} tokens. Deliberately free of Mautic dependencies
 * so the matching rules can be unit tested on their own.
 */
class ContentBlockTokenReplacer
{
    /**
     * Ids only: the builder always writes the numeric id, which survives renaming the block.
     */
    public const TOKEN_PATTERN = '/\{contentblock=(\d+)\}/';

    private const NEEDLE = '{contentblock=';

    /**
     * Cheap pre-check so an email without linked blocks costs one strpos, not a regex.
     */
    public function hasTokens(string $content): bool
    {
        return false !== stripos($content, self::NEEDLE);
    }

    /**
     * @param callable(int): ?string $resolve  returns the replacement, or null when unresolvable
     * @param list<int>              $missing  ids that could not be resolved, appended in place
     */
    public function replace(string $content, callable $resolve, array &$missing = []): string
    {
        return (string) preg_replace_callback(
            self::TOKEN_PATTERN,
            static function (array $match) use ($resolve, &$missing): string {
                $id          = (int) $match[1];
                $replacement = $resolve($id);

                if (null === $replacement) {
                    // Never let a raw token reach a recipient.
                    $missing[] = $id;

                    return '';
                }

                return $replacement;
            },
            $content
        );
    }
}
