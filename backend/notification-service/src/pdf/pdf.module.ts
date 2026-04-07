import { Module, OnModuleDestroy } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';

@Module({
  providers: [PdfService],
  controllers: [PdfController],
  exports: [PdfService],
})
export class PdfModule implements OnModuleDestroy {
  constructor(private readonly pdfService: PdfService) {}

  async onModuleDestroy(): Promise<void> {
    await this.pdfService.closeBrowser();
  }
}
