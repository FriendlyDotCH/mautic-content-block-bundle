<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Form;

use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlock;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class ContentBlockType extends AbstractType
{
    /**
     * Predefined categories. Extend as needed.
     */
    private const CATEGORIES = [
        'General'     => 'General',
        'Header'      => 'Header',
        'Footer'      => 'Footer',
        'Signature'   => 'Signature',
        'Legal'       => 'Legal',
        'Promotional' => 'Promotional',
    ];

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label'      => 'mautic.contentblock.form.name',
                'label_attr' => ['class' => 'control-label'],
                'attr'       => ['class' => 'form-control'],
            ])
            ->add('category', ChoiceType::class, [
                'label'      => 'mautic.contentblock.form.category',
                'label_attr' => ['class' => 'control-label'],
                'attr'       => ['class' => 'form-control'],
                'choices'    => self::CATEGORIES,
            ])
            ->add('htmlContent', TextareaType::class, [
                'label'      => 'mautic.contentblock.form.html_content',
                'label_attr' => ['class' => 'control-label'],
                'attr'       => [
                    'class' => 'form-control',
                    'rows'  => 20,
                    // The textarea is enhanced by CodeMirror in the view
                    'data-codemirror' => 'html',
                ],
            ])
            ->add('buttons', HiddenType::class, [
                'mapped' => false,
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => ContentBlock::class,
        ]);
    }
}
