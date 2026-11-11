<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\DTO;

class AddBlockRequest implements SerializableDtoInterface
{
    private string $name;
    private string $htmlContent;
    private ?string $icon;
    private bool $linked          = false;
    private ?string $compiledHtml = null;
    private ?string $theme        = null;

    public function getName(): string
    {
        return $this->name;
    }

    public function getHtmlContent(): string
    {
        return $this->htmlContent;
    }

    public function getIcon(): ?string
    {
        return $this->icon;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function setHtmlContent(string $htmlContent): self
    {
        $this->htmlContent = $htmlContent;

        return $this;
    }

    public function setIcon(?string $icon): self
    {
        $this->icon = $icon;

        return $this;
    }

    public function isLinked(): bool
    {
        return $this->linked;
    }

    public function setLinked(bool $linked): self
    {
        $this->linked = $linked;

        return $this;
    }

    public function getCompiledHtml(): ?string
    {
        return $this->compiledHtml;
    }

    public function setCompiledHtml(?string $compiledHtml): self
    {
        $this->compiledHtml = $compiledHtml;

        return $this;
    }

    public function getTheme(): ?string
    {
        return $this->theme;
    }

    public function setTheme(?string $theme): self
    {
        $this->theme = $theme;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'name'        => $this->name,
            'htmlContent' => $this->htmlContent,
            'icon'        => $this->icon,
            'linked'      => $this->linked,
            'theme'       => $this->theme,
        ];
    }
}
