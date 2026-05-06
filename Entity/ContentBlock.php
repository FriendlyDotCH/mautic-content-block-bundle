<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Mautic\CoreBundle\Doctrine\Mapping\ClassMetadataBuilder;
use Mautic\CoreBundle\Entity\FormEntity;

#[ORM\Entity]
#[ORM\Table(name: 'content_blocks')]
class ContentBlock extends FormEntity
{
    private ?int $id = null;

    private string $name = '';

    private string $category = 'General';

    private string $htmlContent = '';

    private ?string $thumbnail = null;

    public static function loadMetadata(ORM\ClassMetadata $metadata): void
    {
        $builder = new ClassMetadataBuilder($metadata);

        $builder->setTable('content_blocks')
            ->setCustomRepositoryClass(ContentBlockRepository::class);

        $builder->addId();

        $builder->addNamedField('name', Types::STRING, 'name');

        $builder->createField('category', Types::STRING)
            ->columnName('category')
            ->length(100)
            ->nullable()
            ->build();

        $builder->createField('htmlContent', Types::TEXT)
            ->columnName('html_content')
            ->build();

        $builder->createField('thumbnail', Types::TEXT)
            ->columnName('thumbnail')
            ->nullable()
            ->build();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->isChanged('name', $name);
        $this->name = $name;

        return $this;
    }

    public function getCategory(): string
    {
        return $this->category;
    }

    public function setCategory(string $category): self
    {
        $this->isChanged('category', $category);
        $this->category = $category;

        return $this;
    }

    public function getHtmlContent(): string
    {
        return $this->htmlContent;
    }

    public function setHtmlContent(string $htmlContent): self
    {
        $this->isChanged('htmlContent', $htmlContent);
        $this->htmlContent = $htmlContent;

        return $this;
    }

    public function getThumbnail(): ?string
    {
        return $this->thumbnail;
    }

    public function setThumbnail(?string $thumbnail): self
    {
        $this->thumbnail = $thumbnail;

        return $this;
    }
}
