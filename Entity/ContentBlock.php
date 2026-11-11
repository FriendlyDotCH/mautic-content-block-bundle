<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Mautic\CategoryBundle\Entity\Category;
use Mautic\CoreBundle\Doctrine\Mapping\ClassMetadataBuilder;
use Mautic\CoreBundle\Entity\FormEntity;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Constraints\Callback;
use Symfony\Component\Validator\Context\ExecutionContextInterface;
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

    /**
     * Email theme whose <mj-head> and <mj-body> attributes wrap the block when the
     * form compiles its preview, so it renders the way it will inside an email
     * built from that theme. Preview only - the stored content stays theme-free MJML.
     */
    private ?string $theme = null;

    /**
     * Linked blocks are referenced, not copied: an email stores only {contentblock=<id>} and the
     * content is injected at send time, so editing the block updates every email that uses it.
     * Copy blocks (the default) are inlined into the email when dropped and never change again.
     */
    private bool $linked = false;

    /**
     * Email-safe HTML, compiled from $htmlContent in the browser when a linked block is saved.
     * Only linked blocks need it: there is no server-side MJML compiler, and send-time injection
     * cannot compile. Copy blocks leave this NULL - GrapesJS compiles them when they are dropped.
     */
    private ?string $compiledHtml = null;

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

        $builder->createField('theme', Types::STRING)
            ->columnName('theme')
            ->length(191)
            ->nullable()
            ->build();

        $builder->createField('linked', Types::BOOLEAN)
            ->columnName('is_linked')
            ->option('default', 0)
            ->build();

        $builder->createField('compiledHtml', Types::TEXT)
            ->columnName('compiled_html')
            ->nullable()
            ->build();
    }

    public static function loadValidatorMetadata(ClassMetadata $metadata): void
    {
        $metadata->addConstraint(new UniqueEntity([
            'fields'  => ['name'],
            'message' => 'mautic.contentblock.validation.name_not_unique',
        ]));

        // A linked block is injected at send time, so its compiled HTML must exist. The browser
        // compiles it on save; empty here means MJML compilation failed or JavaScript did not run.
        $metadata->addConstraint(new Callback(static function (self $block, ExecutionContextInterface $context): void {
            if (!$block->isLinked()) {
                return;
            }

            if ('' === trim($block->getHtmlContent())) {
                $context->buildViolation('mautic.contentblock.validation.linked_mjml_required')
                    ->atPath('htmlContent')->addViolation();
            } elseif ('' === trim((string) $block->getCompiledHtml())) {
                $context->buildViolation('mautic.contentblock.validation.linked_not_compiled')
                    ->atPath('htmlContent')->addViolation();
            }
        }));
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

    public function getTheme(): ?string
    {
        return $this->theme;
    }

    public function setTheme(?string $theme): self
    {
        $this->isChanged('theme', $theme);
        $this->theme = $theme;

        return $this;
    }

    /**
     * The canonical getter. Mautic's form PropertyAccessor looks for get*() first, and
     * CommonEntity::__call only maps is*() -> get*(), never the other way round - so a
     * boolean property with only an is*() accessor blows up with "Method getLinked not exists".
     */
    public function getLinked(): bool
    {
        return $this->linked;
    }

    public function isLinked(): bool
    {
        return $this->linked;
    }

    /**
     * Deliberately untyped: YesNoButtonGroupType submits int 0/1, matching core entities.
     *
     * @param bool|int|string $linked
     */
    public function setLinked($linked): self
    {
        $linked = (bool) $linked;
        $this->isChanged('linked', $linked);
        $this->linked = $linked;

        return $this;
    }

    public function getCompiledHtml(): ?string
    {
        return $this->compiledHtml;
    }

    public function setCompiledHtml(?string $compiledHtml): self
    {
        $this->isChanged('compiledHtml', $compiledHtml);
        $this->compiledHtml = $compiledHtml;

        return $this;
    }

    /**
     * The token that references this block from an email's MJML.
     */
    public function getToken(): string
    {
        return '{contentblock='.$this->id.'}';
    }
}
