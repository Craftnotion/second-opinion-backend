export type ProjectStatus = "draft" | "active" | "closed" | "completed" | "published" | "application_closed"

export type ProjectType = "private_limited" | "public_limited" | "sole_proprietorship" | "partnership" | "limited_liability_partnership" | "one_person_company" | "joint_venture"

export type ProjectExperience =
    | "1_3_years"
    | "3_5_years"
    | "5_10_years"
    | "10_15_years"
    | "15_20_years"
    | "20_30_years"
    | "30_plus_years";

export type ProjectLength =
    | "long_term_project"
    | "short_project"
    | "annual"
    | "month_based";

export type ProjectBudget =
    | "below_10k"
    | "10k_50k"
    | "50k_1_lakh"
    | "1_3_lakh"
    | "3_5_lakh"
    | "5_10_lakh"
    | "above_10_lakh";

export type ProjectApplicationStatus =
    | "accepted"
    | "shortlisted"
    | "rejected";

export enum PriceRange {
        BELOW_10K = "Below ₹10K",
        TEN_K_TO_FIFTY_K = "₹10K - ₹50K",
        FIFTY_K_TO_ONE_LAKH = "₹50K - ₹1 Lakh",
        ONE_TO_THREE_LAKH = "₹1 Lakh - ₹3 Lakh",
        THREE_TO_FIVE_LAKH = "₹3 Lakh - ₹5 Lakh",
        FIVE_TO_TEN_LAKH = "₹5 Lakh - ₹10 Lakh",
        ABOVE_TEN_LAKH = "Above ₹10 Lakh"
      }
      
      // Enum keys in snake case:
      
export const PriceRangeSnakeCase = {
        below_10k: PriceRange.BELOW_10K,
        ten_k_to_fifty_k: PriceRange.TEN_K_TO_FIFTY_K,
        fifty_k_to_one_lakh: PriceRange.FIFTY_K_TO_ONE_LAKH,
        one_to_three_lakh: PriceRange.ONE_TO_THREE_LAKH,
        three_to_five_lakh: PriceRange.THREE_TO_FIVE_LAKH,
        five_to_ten_lakh: PriceRange.FIVE_TO_TEN_LAKH,
        above_ten_lakh: PriceRange.ABOVE_TEN_LAKH
      };
      