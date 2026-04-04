import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TenantService } from '../../core/services/tenant.service';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#050f08] text-[#e8f5e9] font-['Syne'] selection:bg-[#22c55e]/30 p-8 relative overflow-hidden">
      <!-- Radial Glow Background -->
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-[#22c55e]/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <!-- Topbar -->
      <div class="flex items-center justify-between mb-12">
        <div class="font-['DM_Mono'] text-[#6b8f72] text-sm tracking-tighter opacity-80">
          /employees
        </div>
        <div class="flex items-center gap-4 bg-[#0d1f12] py-2 px-4 rounded-full border border-[#1a3321]">
          <span class="text-xs font-bold uppercase tracking-widest text-[#6b8f72]">{{ userName() }}</span>
          <div class="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e] to-emerald-800 flex items-center justify-center text-[10px] font-black text-white">
            {{ userName().substring(0, 2).toUpperCase() }}
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="flex items-end justify-between mb-10">
        <div>
          <h1 class="text-5xl font-black mb-2 tracking-tighter uppercase leading-none">Team <span class="text-[#22c55e]">Hub</span></h1>
          <p class="text-[#6b8f72] font-medium tracking-tight">Gérez les accès et les rôles de votre équipe</p>
        </div>
        <button 
          (click)="openCreateModal()"
          class="bg-[#22c55e] text-[#050f08] px-8 py-4 rounded-xl font-black uppercase text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]"
        >
          Nouvel employé
        </button>
      </div>

      <!-- Stats Bar -->
      <div class="grid grid-cols-4 gap-6 mb-12">
        <div class="bg-[#0d1f12] p-6 rounded-2xl border border-[#1a3321] group hover:border-[#22c55e]/30 transition-all">
          <div class="text-[#6b8f72] text-[10px] font-black uppercase tracking-[0.2em] mb-4">Total Employees</div>
          <div class="text-4xl font-black leading-none">{{ stats().total }}</div>
        </div>
        <div class="bg-[#0d1f12] p-6 rounded-2xl border-t-2 border-t-[#22c55e] border-x border-x-[#1a3321] border-b border-b-[#1a3321]">
          <div class="text-[#22c55e] text-[10px] font-black uppercase tracking-[0.2em] mb-4">Active Now</div>
          <div class="text-4xl font-black leading-none">{{ stats().active }}</div>
        </div>
        <div class="bg-[#0d1f12] p-6 rounded-2xl border border-[#1a3321] group hover:border-[#22c55e]/30 transition-all">
          <div class="text-[#6b8f72] text-[10px] font-black uppercase tracking-[0.2em] mb-4">Total Roles</div>
          <div class="text-4xl font-black leading-none">{{ stats().roles }}</div>
        </div>
        <div class="bg-[#0d1f12] p-6 rounded-2xl border border-[#1a3321] group hover:border-[#22c55e]/30 transition-all">
          <div class="text-[#6b8f72] text-[10px] font-black uppercase tracking-[0.2em] mb-4">Added this month</div>
          <div class="text-4xl font-black leading-none">+{{ stats().addedMonth }}</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="flex flex-col gap-6 mb-8">
        <div class="relative group">
          <input 
            type="text" 
            [(ngModel)]="searchQuery"
            placeholder="Rechercher par nom ou email..." 
            class="w-full bg-[#0d1f12] border border-[#1a3321] rounded-2xl px-14 py-5 text-lg font-medium focus:outline-none focus:border-[#22c55e] focus:ring-4 focus:ring-[#22c55e]/10 transition-all placeholder:text-[#6b8f72]/50"
          >
          <i class="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-[#6b8f72] text-xl group-focus-within:text-[#22c55e] transition-colors"></i>
        </div>
        
        <div class="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button 
            *ngFor="let filter of roles"
            (click)="activeFilter.set(filter)"
            [class.bg-[#22c55e]]="activeFilter() === filter"
            [class.text-[#050f08]]="activeFilter() === filter"
            [class.border-[#22c55e]]="activeFilter() === filter"
            [class.bg-transparent]="activeFilter() !== filter"
            [class.text-[#6b8f72]]="activeFilter() !== filter"
            [class.border-[#1a3321]]="activeFilter() !== filter"
            class="px-6 py-2.5 rounded-full border text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap hover:border-[#22c55e]/50"
          >
            {{ filter }}
          </button>
        </div>
      </div>

      <!-- Table Container -->
      <div class="bg-[#0d1f12] rounded-[2rem] border border-[#1a3321] overflow-hidden mb-8">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-[#1a3321]">
              <th class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#6b8f72]">Employé</th>
              <th class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#6b8f72]">Email</th>
              <th class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#6b8f72]">Rôle</th>
              <th class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#6b8f72]">Statut</th>
              <th class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#6b8f72]">Ajouté le</th>
              <th class="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#6b8f72]">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              *ngFor="let emp of filteredEmployees(); let i = index" 
              class="group hover:bg-[#22c55e]/[0.02] transition-colors border-b border-[#1a3321]/50 last:border-0 animate-fadeIn"
              [style.animation-delay]="i * 50 + 'ms'"
            >
              <td class="px-8 py-5">
                <div class="flex items-center gap-4">
                  <div 
                    [ngClass]="getRoleGradient(emp.role)"
                    class="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-lg"
                  >
                    {{ emp.firstName.charAt(0) }}{{ emp.lastName.charAt(0) }}
                  </div>
                  <div>
                    <div class="font-black text-[#e8f5e9] tracking-tight">{{ emp.firstName }} {{ emp.lastName }}</div>
                    <div class="text-[10px] font-['DM_Mono'] text-[#6b8f72] mt-0.5 tracking-tighter">#{{ emp.id.substring(0, 8) }}</div>
                  </div>
                </div>
              </td>
              <td class="px-8 py-5">
                <span class="font-['DM_Mono'] text-sm text-[#6b8f72]">{{ emp.email }}</span>
              </td>
              <td class="px-8 py-5">
                <span 
                  [ngClass]="getRoleBadgeClass(emp.role)"
                  class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border"
                >
                  {{ emp.role }}
                </span>
              </td>
              <td class="px-8 py-5">
                <div class="flex items-center gap-2.5">
                  <div 
                    [class.bg-[#22c55e]]="emp.isActive"
                    [class.shadow-[0_0_8px_rgba(34,197,94,0.4)]]="emp.isActive"
                    [class.bg-gray-600]="!emp.isActive"
                    class="w-2 h-2 rounded-full"
                  ></div>
                  <span class="text-xs font-bold tracking-tight" [class.text-[#e8f5e9]]="emp.isActive" [class.text-[#6b8f72]]="!emp.isActive">
                    {{ emp.isActive ? 'Actif' : 'Inactif' }}
                  </span>
                </div>
              </td>
              <td class="px-8 py-5">
                <span class="font-['DM_Mono'] text-sm text-[#6b8f72]">{{ emp.createdAt | date:'dd MMM yyyy' }}</span>
              </td>
              <td class="px-8 py-5">
                <div class="flex items-center gap-3">
                  <button 
                    (click)="showEmployee(emp)"
                    class="w-8 h-8 rounded-lg bg-[#1a3321] text-[#22c55e] flex items-center justify-center hover:bg-[#22c55e] hover:text-[#050f08] transition-all"
                    title="Voir"
                  >
                    <i class="fa-solid fa-eye text-xs"></i>
                  </button>
                  <button 
                    (click)="editEmployee(emp)"
                    class="w-8 h-8 rounded-lg bg-[#1a3321] text-blue-400 flex items-center justify-center hover:bg-blue-400 hover:text-[#050f08] transition-all"
                    title="Modifier"
                  >
                    <i class="fa-solid fa-pen text-xs"></i>
                  </button>
                  <button 
                    (click)="deleteEmployee(emp)"
                    class="w-8 h-8 rounded-lg bg-[#1a3321] text-red-400 flex items-center justify-center hover:bg-red-400 hover:text-[#050f08] transition-all"
                    title="Supprimer"
                  >
                    <i class="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Empty State -->
        <div *ngIf="filteredEmployees().length === 0" class="py-24 text-center">
          <div class="text-4xl mb-4 opacity-20">📂</div>
          <div class="text-[#6b8f72] font-black uppercase tracking-widest text-xs">Aucun employé trouvé</div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-4">
        <div class="text-[10px] font-black uppercase tracking-widest text-[#6b8f72]">
          Affichage 1–{{ filteredEmployees().length }} sur {{ employees().length }} employés
        </div>
        <div class="flex gap-2">
          <button class="w-10 h-10 rounded-xl border border-[#1a3321] flex items-center justify-center text-[#6b8f72] hover:border-[#22c55e] transition-all"><i class="fa-solid fa-chevron-left"></i></button>
          <button class="w-10 h-10 rounded-xl bg-[#22c55e] flex items-center justify-center text-[#050f08] font-black shadow-[0_0_15px_rgba(34,197,94,0.3)]">1</button>
          <button class="w-10 h-10 rounded-xl border border-[#1a3321] flex items-center justify-center text-[#6b8f72] hover:border-[#22c55e] transition-all"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.4s ease forwards;
      opacity: 0;
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class EmployeesListComponent implements OnInit {
  private auth = inject(AuthService);
  
  employees = signal<Employee[]>([]);
  searchQuery = '';
  activeFilter = signal('Tous');
  roles = ['Tous', 'ACCOUNTANT', 'ADMIN', 'TEAM-MEMBER'];

  userName = computed(() => this.auth.user()?.name || 'Admin');

  stats = computed(() => {
    const list = this.employees();
    const active = list.filter(e => e.isActive).length;
    const uniqueRoles = new Set(list.map(e => e.role)).size;
    const addedThisMonth = list.filter(e => {
      const date = new Date(e.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return {
      total: list.length,
      active,
      roles: uniqueRoles,
      addedMonth: addedThisMonth
    };
  });

  filteredEmployees = computed(() => {
    return this.employees().filter(e => {
      const matchesSearch = 
        e.firstName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        e.lastName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        e.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesFilter = this.activeFilter() === 'Tous' || e.role === this.activeFilter();
      
      return matchesSearch && matchesFilter;
    });
  });

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadEmployees();
  }

  openCreateModal() {
    this.router.navigate(['/employees/create']);
  }

  showEmployee(emp: Employee) {
    this.auth.getEmployee(emp.id).subscribe({
      next: (data) => {
        alert(`Détails de l'employé:\nNom: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nRôle: ${data.role}`);
      },
      error: (err) => {
        console.error('Failed to show employee', err);
        alert(err.error?.message || 'Erreur lors de la récupération des détails');
      }
    });
  }

  editEmployee(emp: Employee) {
    console.log('Edit employee:', emp);
    // TODO: Implémenter la navigation vers l'édition
  }

  deleteEmployee(emp: Employee) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${emp.firstName} ${emp.lastName} ?`)) {
      this.auth.deleteEmployee(emp.id).subscribe({
        next: () => {
          alert('Employé supprimé avec succès');
          this.loadEmployees(); // Refresh list
        },
        error: (err) => {
          console.error('Failed to delete employee', err);
          alert(err.error?.message || 'Erreur lors de la suppression');
        }
      });
    }
  }

  loadEmployees() {
    this.auth.getEmployees().subscribe({
      next: (data) => this.employees.set(data),
      error: (err) => console.error('Failed to load employees', err)
    });
  }

  getRoleGradient(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-gradient-to-br from-purple-500 to-indigo-900';
      case 'MANAGER': return 'bg-gradient-to-br from-orange-400 to-red-900';
      case 'ACCOUNTANT': return 'bg-gradient-to-br from-[#22c55e] to-emerald-900';
      case 'ANALYST': return 'bg-gradient-to-br from-sky-400 to-blue-900';
      case 'HR': return 'bg-gradient-to-br from-pink-400 to-rose-900';
      default: return 'bg-gradient-to-br from-gray-400 to-gray-800';
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'text-purple-400 border-purple-500/20 bg-purple-500/5';
      case 'MANAGER': return 'text-orange-400 border-orange-500/20 bg-orange-500/5';
      case 'ACCOUNTANT': return 'text-[#22c55e] border-[#22c55e]/20 bg-[#22c55e]/5';
      case 'ANALYST': return 'text-sky-400 border-sky-500/20 bg-sky-500/5';
      case 'HR': return 'text-pink-400 border-pink-500/20 bg-pink-500/5';
      default: return 'text-gray-400 border-gray-500/20 bg-gray-500/5';
    }
  }
}
