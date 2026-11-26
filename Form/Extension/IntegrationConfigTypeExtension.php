<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Form\Extension;

use Mautic\IntegrationsBundle\Form\Type\IntegrationConfigType;
use Mautic\PluginBundle\Entity\Integration;
use MauticPlugin\MauticContentBlockBundle\Integration\ContentBlocksIntegration;
use Symfony\Component\Form\AbstractTypeExtension;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;

/**
 * The ContentBlocks integration cannot be unpublished. On its config form (and only there) the
 * published toggle is replaced by a hidden field, and the entity is forced back to published on
 * submit, so a crafted request cannot switch it off either. The Enabled/Auth tab explains this
 * with a note instead (Integration\Support\ConfigSupport::getAuthorizationNote()).
 *
 * @extends AbstractTypeExtension<Integration>
 */
class IntegrationConfigTypeExtension extends AbstractTypeExtension
{
    public static function getExtendedTypes(): iterable
    {
        return [IntegrationConfigType::class];
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        if (ContentBlocksIntegration::NAME !== ($options['integration'] ?? null)) {
            return;
        }

        // The template always renders form.isPublished, so replace the field rather than remove it.
        $builder->add('isPublished', HiddenType::class, ['data' => '1']);

        $builder->addEventListener(FormEvents::POST_SUBMIT, static function (FormEvent $event): void {
            $integration = $event->getData();
            if ($integration instanceof Integration) {
                $integration->setIsPublished(true);
            }
        });
    }
}
