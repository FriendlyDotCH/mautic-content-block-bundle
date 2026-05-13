<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Security\Permissions;

use Mautic\CoreBundle\Security\Permissions\AbstractPermissions;
use Symfony\Component\Form\FormBuilderInterface;

class ContentBlockPermissions extends AbstractPermissions
{
    public function getName(): string
    {
        return 'contentBlock';
    }

    public function definePermissions(): void
    {
        $this->addExtendedPermissions('blocks');
    }

    public function buildForm(FormBuilderInterface &$builder, array $options, array $data): void
    {
        $this->addExtendedFormFields('contentBlock', 'blocks', $builder, $data);
    }
}
