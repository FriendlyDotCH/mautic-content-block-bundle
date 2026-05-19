<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\DTO;

class AddBlockRequest implements SerializableDtoInterface
{
    private string $name;
    private string $htmlContent;
    private ?string $icon;

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

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'name'        => $this->name,
            'htmlContent' => $this->htmlContent,
            'icon'        => $this->icon,
        ];
    }
}
