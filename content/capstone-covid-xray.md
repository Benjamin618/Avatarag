# Projet capstone - Détection COVID-19 sur radiographies thoraciques

## Résumé du projet

Dans le cadre de ma formation DataScientest, j'ai travaillé sur un projet de Data Science intitulé Analysis of Covid-19 chest x-rays. Le projet consiste à classifier automatiquement des radiographies thoraciques en quatre classes : COVID-19, Normal, Lung Opacity et Viral Pneumonia.

Le projet a été réalisé en équipe avec P. Birjandi, B. Daumas et D. Georges, sous le tutorat de R. Lesieur. Un premier rendu a porté sur l'exploration et la compréhension du dataset, puis un second rendu sur la modélisation, l'évaluation et l'interprétabilité des modèles.

L'application associée est disponible sur Streamlit : https://mar25cds-xray.streamlit.app/

## Contexte métier

Le contexte métier est l'aide au diagnostic à partir d'images de radiographies pulmonaires, en particulier lorsque les tests PCR ou les moyens de diagnostic plus coûteux sont moins accessibles. Le projet reste un démonstrateur pédagogique et ne constitue pas un outil clinique validé.

L'objectif est de tester si des modèles de machine learning et de deep learning peuvent reconnaître des patterns radiographiques associés à différentes classes pulmonaires, tout en évaluant les risques de biais liés aux artefacts d'image.

## Dataset

Le projet utilise le dataset Kaggle COVID-19 Radiography Database. Le dataset contient 21 165 radiographies thoraciques au format 299 x 299 pixels, réparties en quatre classes : COVID, Normal, Lung Opacity et Viral Pneumonia.

La distribution des classes est déséquilibrée : environ 3 616 images COVID, 10 192 images Normal, 6 012 images Lung Opacity et 1 345 images Viral Pneumonia. Le rapport entre la classe majoritaire et la classe minoritaire est d'environ 7,6.

Chaque image est accompagnée d'un masque de segmentation pulmonaire. Les images sont en 299 x 299 pixels, tandis que les masques sont en 256 x 256 pixels, ce qui impose un redimensionnement des masques pour les appliquer correctement aux radiographies.

## Exploration des données

La première phase du projet a consisté à prendre en main le dataset, vérifier sa structure, analyser les métadonnées, contrôler la qualité des images, rechercher des doublons, étudier le déséquilibre des classes et explorer les différences visuelles entre les classes.

L'analyse exploratoire a mis en évidence plusieurs points importants : la qualité globale des données est correcte, mais le cadrage et la luminosité des clichés doivent être normalisés pour fiabiliser l'apprentissage. Le déséquilibre des classes nécessite des stratégies de pondération, d'oversampling ou de data augmentation.

Les métadonnées disponibles sont limitées et ne contiennent pas d'informations cliniques détaillées comme l'âge, le sexe, la date ou l'hôpital. Le modèle doit donc s'appuyer essentiellement sur le contenu visuel des images.

## Feature engineering

La phase d'exploration a testé plusieurs variables explicatives dérivées des images et des masques : taille estimée des poumons, luminosité moyenne dans la zone pulmonaire, luminosité hors masque, contraste, proportions de niveaux de gris, asymétrie et distribution des pixels.

Certaines observations ont été utiles pour préparer la modélisation. Les images normales présentent davantage de zones sombres ou gris foncé. Les images COVID montrent davantage de zones claires ou blanches. Les pneumonies virales présentent peu de zones blanches et des structures plus sombres. Les analyses de variance par pixel ont aussi montré que les images avec et sans masque apportaient chacune des informations pertinentes.

Cette phase m'a permis de relier l'analyse exploratoire à la conception des modèles, en identifiant des variables potentiellement discriminantes, robustes et stables.

## Prétraitement et data augmentation

Le projet a étudié le déséquilibre de classes et a retenu la data augmentation comme stratégie pertinente, plutôt qu'un simple sous-échantillonnage de la classe majoritaire. Les transformations envisagées incluent le flip horizontal, les rotations légères, les variations de luminosité et contraste, les translations et les zooms légers.

La librairie Albumentations a été identifiée comme un outil adapté, car elle permet d'appliquer des transformations synchronisées aux images et aux masques.

## Modèles testés

Plusieurs familles de modèles ont été comparées :

- modèles de machine learning classiques sur features explicites, notamment SVM et Random Forest ;
- CNN custom entraîné from scratch sur les images ;
- ResNet50 avec transfer learning comme référence deep learning avancée.

Les modèles classiques servent de baselines interprétables. Le CNN custom sert de première baseline deep learning adaptée au traitement d'image. ResNet50 sert de modèle expert grâce au pré-entraînement ImageNet et aux connexions résiduelles qui facilitent l'apprentissage profond.

## Architecture ResNet50

L'architecture finale ResNet50 utilise un backbone pré-entraîné, puis un classifieur personnalisé. Le backbone extrait 2048 features. Le classifieur ajoute du dropout, une couche linéaire de 2048 vers 256 avec activation ReLU, un second dropout, puis une couche linéaire de 256 vers 4 classes.

Cette architecture permet de comparer les approches images complètes et images masquées, avec ou sans data augmentation, et d'évaluer la robustesse du modèle face aux artefacts hors poumons.

## Résultats

Les modèles classiques Random Forest et SVM atteignent environ 80 % d'accuracy, mais montrent une dépendance importante aux artefacts hors poumons. Le CNN custom atteint environ 81 % d'accuracy, mais reste limité par rapport aux architectures plus avancées.

ResNet50 est le meilleur modèle du projet. Le résultat principal rapporté est d'environ 95,07 % d'accuracy, avec un delta de robustesse de -2,66 %. Ce delta mesure la perte de performance lorsque les artefacts hors poumons sont supprimés via les masques. Comme cette perte reste inférieure à 3 %, le modèle est considéré comme robuste dans le cadre du protocole du projet.

Une variante ResNet50 avec RandomAugment, alignement géométrique et images non masquées atteint aussi 92,1 % d'accuracy dans un focus expérimental, avec des performances homogènes entre les classes.

## Robustesse anti-biais

Un risque important en imagerie médicale est que le modèle apprenne des biais d'équipement, comme des marqueurs, électrodes, logos, textes ou câbles, au lieu d'apprendre les vrais signaux pulmonaires.

Pour tester ce risque, le projet compare les performances entre images brutes et images masquées. Les modèles Random Forest et SVM perdent plus de 7 points lorsque les artefacts sont retirés, ce qui suggère une dépendance aux éléments hors poumons. ResNet50 ne perd que 2,66 points, ce qui indique une meilleure focalisation sur les régions pulmonaires.

Cette validation anti-biais est un point fort du projet, car elle dépasse la simple recherche d'accuracy.

## Interprétabilité

Le projet utilise Grad-CAM et SHAP pour interpréter les décisions du modèle. Grad-CAM montre les zones de l'image qui influencent le plus la prédiction, tandis que SHAP estime la contribution marginale des pixels à la décision.

Grad-CAM est adapté au temps réel, avec une latence autour de 100 ms. SHAP est beaucoup plus coûteux, environ 2 minutes par image, mais permet une analyse plus fine dans les cas difficiles.

Les visualisations confirment globalement que les modèles se concentrent sur les régions pulmonaires plutôt que sur les artefacts d'équipement. Les limites observées concernent notamment certaines confusions entre classes proches, par exemple COVID et Lung Opacity, ou Viral Pneumonia et COVID.

## Limites

Le projet reste un démonstrateur pédagogique. Il n'est pas validé cliniquement et ne doit pas être présenté comme un outil de diagnostic médical opérationnel.

Les principales limites sont la dépendance à un dataset unique, le déséquilibre des classes, les confusions entre pathologies visuellement proches, et le besoin d'une validation externe sur d'autres hôpitaux, équipements et populations.

Les perspectives incluent une validation sur des datasets externes comme ChestX-ray14, MIMIC-CXR ou PadChest, l'exploration d'architectures comme EfficientNet ou Vision Transformers, et une validation clinique des heatmaps par des radiologues.

## Ce que ce projet démontre

Ce projet démontre ma capacité à conduire une démarche complète de Data Science appliquée à l'image : exploration de données, feature engineering, préparation du dataset, traitement du déséquilibre de classes, entraînement de modèles ML et deep learning, transfer learning, évaluation par métriques, analyse de robustesse, interprétabilité et déploiement d'une application Streamlit.

Il montre aussi ma sensibilité aux questions de robustesse et de biais, ce qui est essentiel pour des applications IA en contexte industriel ou médical.
