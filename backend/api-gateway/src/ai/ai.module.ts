// Importe le décorateur Module de NestJS
import { Module } from '@nestjs/common';
// Importe le contrôleur d'IA
import { AiController } from './ai.controller';
// Importe le service d'IA
import { AiService } from './ai.service';

// Définit le module IA qui regroupe le contrôleur et le service
@Module({
  controllers: [AiController], // Déclare le contrôleur utilisé par ce module
  providers: [AiService],     // Déclare le service fourni par ce module
  exports: [AiService],       // Rend le service exportable pour d'autres modules
})
export class AiModule {}

//
// Ce fichier définit le module NestJS pour les fonctionnalités d'intelligence artificielle (IA).
// Il regroupe le contrôleur et le service d'IA pour permettre leur utilisation dans l'application.