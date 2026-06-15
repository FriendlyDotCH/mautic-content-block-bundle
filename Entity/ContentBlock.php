<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Mautic\CategoryBundle\Entity\Category;
use Mautic\CoreBundle\Doctrine\Mapping\ClassMetadataBuilder;
use Mautic\CoreBundle\Entity\FormEntity;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Mapping\ClassMetadata;

#[ORM\Entity]
#[ORM\Table(name: 'friendly_content_blocks')]
class ContentBlock extends FormEntity
{
    private ?int $id = null;

    private string $name = '';

    private ?Category $category = null;

    private string $htmlContent = '';

    private ?string $thumbnail = null;

    private ?string $icon = null;

    public static function loadMetadata(ORM\ClassMetadata $metadata): void
    {
        $builder = new ClassMetadataBuilder($metadata);

        $builder->setTable('friendly_content_blocks')
            ->setCustomRepositoryClass(ContentBlockRepository::class);

        $builder->addId();

        $builder->addNamedField('name', Types::STRING, 'name');

        $builder->addCategory();

        $builder->createField('htmlContent', Types::TEXT)
            ->columnName('html_content')
            ->build();

        $builder->createField('thumbnail', Types::TEXT)
            ->columnName('thumbnail')
            ->nullable()
            ->build();

        $builder->createField('icon', Types::STRING)
            ->columnName('icon')
            ->length(20)
            ->nullable()
            ->build();
    }

    public static function loadValidatorMetadata(ClassMetadata $metadata): void
    {
        $metadata->addConstraint(new UniqueEntity([
            'fields'  => ['name'],
            'message' => 'mautic.contentblock.validation.name_not_unique',
        ]));
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

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): self
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

    public function getIcon(): ?string
    {
        return $this->icon;
    }

    public function setIcon(?string $icon): self
    {
        $this->isChanged('icon', $icon);
        $this->icon = $icon;

        return $this;
    }
}
