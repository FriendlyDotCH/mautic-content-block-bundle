<?php

declare(strict_types=1);

namespace MauticPlugin\MauticContentBlockBundle\Form\Type;

use Mautic\CoreBundle\Form\Type\FormButtonsType;
use MauticPlugin\MauticContentBlockBundle\Entity\ContentBlock;
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
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'label'       => 'mautic.core.name',
                'label_attr'  => ['class' => 'control-label'],
                'attr'        => ['class' => 'form-control', 'maxlength' => 191],
                'required'    => true,
                'constraints' => [
                    new NotBlank(['message' => 'mautic.core.value.required']),
                    new Length(['max' => 191]),
                ],
            ])
            ->add('cbCategory', ChoiceType::class, [
                'label'      => 'mautic.core.category',
                'label_attr' => ['class' => 'control-label'],
                'attr'       => ['class' => 'form-control'],
                'required'   => false,
                'choices'    => [
                    'General'     => 'general',
                    'Header'      => 'header',
                    'Footer'      => 'footer',
                    'Signature'   => 'signature',
                    'Legal'       => 'legal',
                    'Promotional' => 'promotional',
                ],
            ])
            ->add('icon', HiddenType::class, [
                'required' => false,
            ])
            ->add('htmlContent', TextareaType::class, [
                'label'      => 'mautic.contentblock.html_content',
                'label_attr' => ['class' => 'control-label'],
                'attr'       => [
                    'class' => 'form-control',
                    'rows'  => 22,
                    'style' => "font-family:'Courier New',monospace;font-size:12px;line-height:1.5;resize:vertical;",
                ],
                'required' => false,
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
