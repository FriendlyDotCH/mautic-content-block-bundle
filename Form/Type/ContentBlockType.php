<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Form\Type;

use Mautic\CoreBundle\Form\Type\FormButtonsType;
use Mautic\CoreBundle\Form\Type\YesNoButtonGroupType;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlock;
use MauticPlugin\MauticContentBlockBundle\Service\ThemeMjmlProvider;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class ContentBlockType extends AbstractType
{
    public function __construct(
        private ThemeMjmlProvider $themeMjmlProvider
    ) {
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label'       => 'mautic.core.name',
                'label_attr'  => ['class' => 'control-label'],
                'attr'        => ['class' => 'form-control', 'maxlength' => 191],
                'required'    => true,
                'empty_data'  => '',
                'constraints' => [
                    new NotBlank(['message' => 'mautic.core.value.required']),
                    new Length(['max' => 100]),
                ],
            ])
            // Category input hidden for now; new blocks default to General
            // via ContentBlockModel::saveEntity().
            ->add('icon', HiddenType::class, [
                'required' => false,
            ])
            // No 'data' option: the value is read from the entity through getLinked(),
            // so a failed submit re-renders with what the user chose, not the stored value.
            ->add('linked', YesNoButtonGroupType::class, [
                'label' => 'mautic.contentblock.linked',
                'attr'  => ['tooltip' => 'mautic.contentblock.linked.tooltip'],
            ])
            // Written by the browser on save: a linked block is injected at send time, where
            // there is no MJML compiler, so its HTML has to be compiled here first.
            ->add('compiledHtml', HiddenType::class, [
                'required' => false,
            ])
            ->add('theme', ChoiceType::class, [
                'label'       => 'mautic.contentblock.theme',
                'label_attr'  => ['class' => 'control-label'],
                'choices'     => array_flip($this->themeMjmlProvider->getEmailThemeChoices()),
                'required'    => false,
                'placeholder' => 'mautic.contentblock.theme.none',
                'attr'        => [
                    'class'   => 'form-control',
                    'tooltip' => 'mautic.contentblock.theme.tooltip',
                ],
            ])
            ->add('htmlContent', TextareaType::class, [
                'label'      => 'mautic.contentblock.html_content',
                'label_attr' => ['class' => 'control-label'],
                'attr'       => [
                    'class'     => 'form-control',
                    'rows'      => 22,
                    'maxlength' => 30000,
                    'style'     => "font-family:'Courier New',monospace;font-size:12px;line-height:1.5;resize:vertical;",
                ],
                'required'    => false,
                'empty_data'  => '',
                'constraints' => [
                    new Length(['max' => 30000]),
                ],
            ])
            ->add('buttons', FormButtonsType::class);

        if (!empty($options['action'])) {
            $builder->setAction($options['action']);
        }
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => ContentBlock::class]);
    }

    public function getBlockPrefix(): string
    {
        return 'content_block';
    }
}
