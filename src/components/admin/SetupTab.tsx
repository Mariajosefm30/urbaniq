import OrganizationSection from "./OrganizationSection";
import BuildingsSection from "./BuildingsSection";
import ManagersSection from "./ManagersSection";
import RolePromoter from "./RolePromoter";

interface SetupTabProps {
  organization: any;
  onOrganizationUpdate: () => void;
}

export default function SetupTab({ organization, onOrganizationUpdate }: SetupTabProps) {
  return (
    <div className="space-y-6">
      <OrganizationSection 
        organization={organization} 
        onUpdate={onOrganizationUpdate}
      />
      
      <BuildingsSection orgId={organization?.id} />
      
      <ManagersSection orgId={organization?.id} />

      <RolePromoter />
    </div>
  );
}
