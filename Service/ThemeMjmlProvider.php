<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Service;

use Mautic\CoreBundle\Helper\ThemeHelperInterface;
use Mautic\EmailBundle\Entity\Email;
use Psr\Log\LoggerInterface;
use Twig\Environment;

/**
 * Reads an email theme the same way the GrapesJS builder does and returns the parts a
 * content block needs to be compiled "in the theme's context": <mj-head> (mj-attributes,
 * mj-font, mj-style ...) and the attributes of <mj-body> (width, background colour).
 *
 * Ported from the Email Snippets plugin so a block's preview matches what the block will
 * look like once it is dropped into an email built from the same theme.
 */
class ThemeMjmlProvider
{
    public function __construct(
        private ThemeHelperInterface $themeHelper,
        private Environment $twig,
        private LoggerInterface $logger
    ) {
    }

    /**
     * @return array<string, string> theme key => name
     */
    public function getEmailThemeChoices(): array
    {
        $themes = $this->themeHelper->getInstalledThemes('email');
        asort($themes);

        return $themes;
    }

    /**
     * @return array{isMjml: bool, head: string, bodyAttributes: string}
     */
    public function getThemeParts(string $theme): array
    {
        $result = ['isMjml' => false, 'head' => '', 'bodyAttributes' => ''];

        if (!array_key_exists($theme, $this->themeHelper->getInstalledThemes('email'))) {
            return $result;
        }

        $rendered = $this->renderTheme($theme);
        if (null === $rendered || !str_contains($rendered, '<mjml')) {
            return $result;
        }

        $result['isMjml'] = true;

        if (preg_match('#<mj-head\b[^>]*>(.*?)</mj-head>#is', $rendered, $match)) {
            $result['head'] = trim($match[1]);
        }

        if (preg_match('#<mj-body\b([^>]*)>#i', $rendered, $match)) {
            $result['bodyAttributes'] = trim($match[1]);
        }

        return $result;
    }

    private function renderTheme(string $theme): ?string
    {
        // Same lookup order as GrapesJsController: legacy email.mjml.twig, then email.html.twig containing <mjml>
        foreach (['email.mjml.twig', 'email.html.twig'] as $file) {
            $template = '@themes/'.$theme.'/html/'.$file;
            if (!$this->twig->getLoader()->exists($template)) {
                continue;
            }

            try {
                return $this->twig->render($template, [
                    'isNew'    => true,
                    'slots'    => [],
                    'content'  => [],
                    'email'    => new Email(),
                    'template' => $theme,
                    'basePath' => '',
                ]);
            } catch (\Throwable $e) {
                $this->logger->error('[ContentBlocks] Could not render theme '.$theme.': '.$e->getMessage());

                return null;
            }
        }

        return null;
    }
}
