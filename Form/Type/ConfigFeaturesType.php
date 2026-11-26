<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Form\Type;

use MauticPlugin\MauticContentBlockBundle\Service\ContentBlockConfigService;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;
use Symfony\Component\Validator\Constraints\GreaterThanOrEqual;
use Symfony\Component\Validator\Constraints\NotBlank;

/**
 * Feature settings of the ContentBlocks integration (Plugins > Content Blocks > Features).
 *
 * @extends AbstractType<array<string, mixed>>
 */
class ConfigFeaturesType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder->add(
            ContentBlockConfigService::CACHE_TTL,
            IntegerType::class,
            [
                'label'       => 'mautic.contentblock.config.cache_ttl',
                'label_attr'  => ['class' => 'control-label'],
                'attr'        => [
                    'class'   => 'form-control',
                    'min'     => 0,
                    'tooltip' => 'mautic.contentblock.config.cache_ttl.tooltip',
                ],
                'required'    => true,
                'constraints' => [
                    new NotBlank(),
                    new GreaterThanOrEqual(0),
                ],
            ]
        );

        // Prefill the default only when nothing is stored yet. The field's `data` option would
        // instead overwrite the saved value every time the form is shown.
        $builder->addEventListener(FormEvents::PRE_SET_DATA, static function (FormEvent $event): void {
            $data = $event->getData();
            $data = is_array($data) ? $data : [];
            $data[ContentBlockConfigService::CACHE_TTL] ??= ContentBlockConfigService::DEFAULT_CACHE_TTL;
            $event->setData($data);
        });
    }
}
