import VerifiedBadge from "./VerifiedBadge";

export default function UserName({ user, className = "" }) {
	if (!user) return null;
		return (
			<span className={`inline-flex items-center gap-1 ${className}`}>
				{user.name}
				{user.role && (
					<VerifiedBadge role={user.role} isVerified={user.isVerified} />
				)}
			</span>
		);
}
