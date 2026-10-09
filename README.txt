MA VIDEOTHEQUE — TEST D’IMPORT EXCEL (VERSION 4)

Cette copie est destinée aux essais. Elle ne modifie pas le site publié sur GitHub.

Contenu : interface V1 et données importées depuis Inventaire_Films_OK(4).xlsx.
Nombre de fiches importées : 2819.

Correspondances :
- Titre -> title
- Titre original -> original
- Type -> type
- Réalisateur -> director
- Scénariste -> screenwriter
- Acteurs -> cast
- Durée -> duration (par exemple 88mn devient 88 minutes)
- Musique -> music
- Support -> format
- Synopsis -> synopsis
- Bonus -> bonus
- Année originale -> year_original (si Excel contient une date, seule l’année est retenue)
- Date sortie France -> release_fr_date (format AAAA-MM-JJ)
- Images -> image
- Pays -> country
- saga -> saga
- Editeur -> publisher
- Genre -> genre

Les cellules vides restent vides. Aucune information n’est complétée automatiquement.
Les champs Scénariste, Pays, Saga, Éditeur et Genre sont conservés dans les données JSON. L’interface V1 ne les affiche pas encore sur les fiches; la recherche générale peut toutefois les retrouver.

Pour tester en local : ouvrez index.html dans un navigateur. Selon les restrictions du navigateur sur fetch() depuis un fichier local, le chargement peut être bloqué. Le test le plus fiable se fait en déployant cette copie dans un dépôt GitHub distinct, sans toucher au site principal.
