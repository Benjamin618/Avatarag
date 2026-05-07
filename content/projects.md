# Projets - Benjamin Daumas

## Projet capstone Data Science

Mon projet capstone Data Science porte sur la détection du COVID-19 à partir de radiographies thoraciques avec du machine learning et du deep learning.

Le projet utilise le dataset Kaggle COVID-19 Radiography Database, avec 21 165 radiographies réparties en quatre classes : COVID, Normal, Viral Pneumonia et Lung Opacity.

Les techniques utilisées incluent l'analyse exploratoire d'images, le feature engineering sur masques pulmonaires, la data augmentation avec Albumentations, des baselines Random Forest et SVM, un CNN custom, ResNet50 avec transfer learning, Grad-CAM, SHAP et une validation anti-biais.

Le meilleur modèle identifié est ResNet50, avec environ 95,07 % d'accuracy et un delta de robustesse de -2,66 % entre images brutes et images masquées. Ce résultat suggère que le modèle se concentre davantage sur les régions pulmonaires que sur les artefacts d'équipement.

Une application Streamlit permet de présenter les résultats : https://mar25cds-xray.streamlit.app/

Ce projet démontre une mise en pratique complète du deep learning sur un cas d'imagerie médicale pédagogique : EDA, preprocessing, modélisation, comparaison de modèles, interprétabilité, robustesse et déploiement.

## Plateforme Engine Management System M3D

Benjamin a été System Architect sur la plateforme Engine Management System M3D. Il a conçu des lois de contrôle pour une plateforme EFI drive-by-wire, notamment sur le couple, l'ETC, l'injection, l'allumage et la sécurité.

La plateforme a été déployée sur des motos Ducati comme Monster, Supersport et Hypermotard.

Ce projet démontre une capacité à concevoir des systèmes embarqués critiques et à livrer une plateforme utilisée en production.

## Motor Control Unit pour direction assistée électrique

Chez Continental, Benjamin a contribué au lancement production d'une Motor Control Unit pour JTEKT / Stellantis dans le domaine de la direction assistée électrique.

Les sujets techniques incluaient la capture d'angle volant et le contrôle de moteur brushless.

Ce projet illustre son expérience sur des produits automobiles de production, avec coordination internationale et interface client.

## Portfolio RAG Avatar

Ce projet de portfolio transforme le CV et les informations professionnelles de Benjamin en base de connaissance exploitable par un avatar conversationnel.

Il démontre une capacité à construire une application web déployable avec Next.js, TypeScript, OpenAI, embeddings, retrieval sur corpus Markdown, endpoint backend et interface recruteur.

Le projet est conçu comme une démo portfolio utile et explicable en entretien.
