<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Tests\Unit;

use MauticPlugin\MauticContentBlockBundle\Service\ContentBlockTokenReplacer;
use PHPUnit\Framework\TestCase;

class ContentBlockTokenReplacerTest extends TestCase
{
    private ContentBlockTokenReplacer $replacer;

    protected function setUp(): void
    {
        $this->replacer = new ContentBlockTokenReplacer();
    }

    public function testHasTokensIsCheapAndCaseInsensitive(): void
    {
        $this->assertTrue($this->replacer->hasTokens('<p>{contentblock=28}</p>'));
        $this->assertTrue($this->replacer->hasTokens('{CONTENTBLOCK=28}'));
        $this->assertFalse($this->replacer->hasTokens('<p>no blocks here</p>'));
        $this->assertFalse($this->replacer->hasTokens(''));
    }

    public function testReplacesEveryOccurrence(): void
    {
        $html = '<div>{contentblock=28}</div><div>{contentblock=29}</div><div>{contentblock=28}</div>';

        $result = $this->replacer->replace($html, static fn (int $id): string => "[block {$id}]");

        $this->assertSame('<div>[block 28]</div><div>[block 29]</div><div>[block 28]</div>', $result);
    }

    public function testUnresolvableTokenIsRemovedAndReported(): void
    {
        $missing = [];

        $result = $this->replacer->replace(
            'a{contentblock=1}b{contentblock=2}c',
            static fn (int $id): ?string => 2 === $id ? 'TWO' : null,
            $missing
        );

        // A raw token must never reach a recipient.
        $this->assertSame('abTWOc', $result);
        $this->assertSame([1], $missing);
    }

    public function testIgnoresNonNumericAndMalformedTokens(): void
    {
        $untouched = '{contentblock=footer} {contentblock=} {contentblock} {snippet=footer}';

        $result = $this->replacer->replace($untouched, static fn (int $id): string => 'REPLACED');

        $this->assertSame($untouched, $result);
    }

    public function testDoesNotRecurseIntoReplacementContent(): void
    {
        // A block whose own HTML contains a token must not be expanded again, so blocks cannot loop.
        $result = $this->replacer->replace(
            '{contentblock=1}',
            static fn (int $id): string => 'start {contentblock=1} end'
        );

        $this->assertSame('start {contentblock=1} end', $result);
    }
}
